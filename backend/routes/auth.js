const {
  loginLimiter,
  forgotPasswordLimiter,
  registerLimiter,
} = require("../middleware/rate-limiter");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dns = require("dns").promises;
const nodemailer = require("nodemailer");
const { pool } = require("../db");
const config = require("../config");

const APP_PUBLIC_URL = config.APP_PUBLIC_URL;
const SMTP_ENABLED = config.SMTP.ENABLED;
const JWT_SECRET = config.JWT_SECRET;
const mailer = SMTP_ENABLED
  ? nodemailer.createTransport({
      host: config.SMTP.HOST,
      port: config.SMTP.PORT,
      secure: config.SMTP.SECURE,
      auth: { user: config.SMTP.USER, pass: config.SMTP.PASS },
    })
  : null;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}
function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
async function hasMxBestEffort(email) {
  const domain = String(email).split("@")[1] || "";
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch (e) {
    return null;
  }
}
async function sendVerifyEmail(toEmail, token) {
  const verifyLink = `${APP_PUBLIC_URL}/login.html?verify=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: config.SMTP.FROM,
    to: toEmail,
    subject: "Xác nhận email - WebGIS",
    html: `<p>Bấm link để xác nhận email: 
       <a href="${verifyLink}">${verifyLink}</a></p>`,
  });
}
async function logLoginAttempt({
  req,
  userId = null,
  email = null,
  success,
  reason = null,
}) {
  try {
    const ua = (req.headers["user-agent"] || "").toString().slice(0, 500);
    const ip = (req.headers["x-forwarded-for"] || req.ip || "")
      .toString()
      .split(",")[0]
      .trim()
      .slice(0, 80);
    await pool.query(
      `INSERT INTO public.lich_su_dang_nhap (tai_khoan_id, email,
       thanh_cong, ly_do, ip, user_agent) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, email, !!success, reason, ip, ua],
    );
  } catch (e) {
    console.error(e.message);
  }
}
async function getUserRolesPermsByEmail(email) {
  const sql = `SELECT tk.*, COALESCE(array_agg(DISTINCT vt.ma) FILTER (WHERE vt.ma IS   
       NOT NULL), '{}') AS roles, COALESCE(array_agg(DISTINCT q.ma) FILTER (WHERE q.ma IS NOT NULL), '{}') AS permissions FROM
       public.tai_khoan tk LEFT JOIN public.tai_khoan_vai_tro tkvt ON tkvt.tai_khoan_id = tk.id LEFT JOIN public.vai_tro vt ON vt.id =        
       tkvt.vai_tro_id LEFT JOIN public.vai_tro_quyen vtq ON vtq.vai_tro_id = vt.id LEFT JOIN public.quyen q ON q.id = vtq.quyen_id WHERE     
       tk.email = $1 GROUP BY tk.id;`;
  const { rows } = await pool.query(sql, [email]);
  return rows[0] || null;
}
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: "8h" },
  );
}

router.post("/register", registerLimiter, async (req, res) => {
  const client = await pool.connect();
  let emailSent = false;
  try {
    const { ho_ten, email, mat_khau } = req.body || {};
    const em = normalizeEmail(email);
    if (!ho_ten || !em || !mat_khau)
      return res.status(400).json({ message: "Thiếu dữ liệu" });

    await client.query("BEGIN");
    const existed = await client.query(
      "SELECT id, email_da_xac_nhan FROM public.tai_khoan WHERE email=$1",
      [em],
    );
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (existed.rows[0]) {
      if (existed.rows[0].email_da_xac_nhan) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Email đã tồn tại" });
      }
      await client.query(
        "UPDATE public.tai_khoan SET email_xac_nhan_token_hash=$2, email_xac_nhan_exp=now() + interval '24 hours' WHERE id=$1",
        [existed.rows[0].id, tokenHash],
      );
    } else {
      const hash = await bcrypt.hash(mat_khau, 10);
      const { rows } = await client.query(
        "INSERT INTO public.tai_khoan (ho_ten, email, mat_khau_hash, trang_thai, email_da_xac_nhan) VALUES ($1, $2, $3, 'cho_duyet', false) RETURNING id",
        [ho_ten, em, hash],
      );
      await client.query(
        "INSERT INTO public.tai_khoan_vai_tro(tai_khoan_id, vai_tro_id) SELECT $1, id FROM public.vai_tro WHERE ma='guest'",
        [rows[0].id],
      );
      await client.query(
        "UPDATE public.tai_khoan SET email_xac_nhan_token_hash=$2, email_xac_nhan_exp=now() + interval '24 hours' WHERE id=$1",
        [rows[0].id, tokenHash],
      );
    }
    await client.query("COMMIT");
    try {
      await sendVerifyEmail(em, token);
      emailSent = true;
    } catch (e) {
      console.error("Mail error:", e.message);
    }
    return res.json({
      ok: true,
      message: emailSent
        ? "Đăng ký thành công. Check mail nhé."
        : "Tài khoản đã tạo nhưng gửi mail lỗi.",
    });
  } catch (e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Lỗi", detail: e.message });
  } finally {
    client.release();
  }
});

router.get("/xac-nhan-email", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows } = await pool.query(
      "UPDATE public.tai_khoan SET email_da_xac_nhan=true, email_xac_nhan_token_hash=NULL WHERE email_xac_nhan_token_hash=$1 AND email_xac_nhan_exp > now() RETURNING id",
      [tokenHash],
    );
    if (!rows[0]) return res.status(400).json({ message: "Token hết hạn" });
    return res.json({ ok: true, message: "Xác nhận thành công" });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi", detail: e.message });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const user = await getUserRolesPermsByEmail(username);

    // 1. Kiểm tra tài khoản và mật khẩu
    if (!user || !(await bcrypt.compare(password, user.mat_khau_hash || ""))) {
      await logLoginAttempt({
        req,
        email: username,
        success: false,
        reason: "fail",
      });
      return res.status(401).json({ message: "Sai tài khoản/mật khẩu" });
    }

    // 2. Kiểm tra xác nhận email
    if (!user.email_da_xac_nhan) {
      return res
        .status(403)
        .json({ message: "Vui lòng xác nhận email trước khi đăng nhập!" });
    }

    // --- BỔ SUNG ĐOẠN NÀY ĐỂ SỬA LỖI CỦA BẠN ---
    // 3. Kiểm tra trạng thái phê duyệt từ Admin
    if (user.trang_thai === "cho_duyet") {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đang chờ Admin phê duyệt. Vui lòng quay lại sau!",
      });
    }

    if (user.trang_thai === "khoa") {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!",
      });
    }
    // ------------------------------------------

    // Nếu mọi thứ ok mới cấp Token
    const token = signToken(user);
    await logLoginAttempt({
      req,
      userId: user.id,
      email: user.email,
      success: true,
    });

    return res.json({
      ok: true,
      token,
      ho_ten: user.ho_ten,
      roles: user.roles,
      permissions: user.permissions,
    });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi hệ thống", detail: e.message });
  }
});

async function sendResetPasswordEmail(toEmail, token) {
  const resetLink = `${APP_PUBLIC_URL}/login.html?reset=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    to: toEmail,
    subject: "Reset mật khẩu",
    html: `<a href="${resetLink}">Reset link</a>`,
  });
}

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const em = normalizeEmail(req.body?.email);
    const { rows } = await client.query(
      "SELECT id FROM public.tai_khoan WHERE email=$1",
      [em],
    );
    if (!rows[0])
      return res.json({
        ok: true,
        message: "Nếu email tồn tại, link đã được gửi.",
      });
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM public.token_quen_mat_khau WHERE tai_khoan_id=$1 AND da_su_dung_luc IS NULL",
      [rows[0].id],
    );
    await client.query(
      "INSERT INTO public.token_quen_mat_khau (tai_khoan_id, token_ma_hoa, het_han_luc) VALUES ($1, $2, now() + interval '30 minutes')",
      [rows[0].id, tokenHash],
    );
    await client.query("COMMIT");
    try {
      await sendResetPasswordEmail(em, token);
    } catch (e) {
      console.error(e);
    }
    return res.json({ ok: true, message: "Check mail nhé." });
  } catch (e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Lỗi" });
  } finally {
    client.release();
  }
});

router.post("/reset-password", async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, email, new_password } = req.body || {};
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT tq.id, tk.id as user_id FROM public.token_quen_mat_khau tq JOIN public.tai_khoan tk ON tk.id = tq.tai_khoan_id WHERE tk.email=$1 AND tq.token_ma_hoa=$2 AND tq.da_su_dung_luc IS NULL AND tq.het_han_luc > now()",
      [email, tokenHash],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Link sai" });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await client.query(
      "UPDATE public.tai_khoan SET mat_khau_hash=$2 WHERE id=$1",
      [rows[0].user_id, hash],
    );
    await client.query(
      "UPDATE public.token_quen_mat_khau SET da_su_dung_luc=now() WHERE id=$1",
      [rows[0].id],
    );
    await client.query("COMMIT");
    return res.json({ ok: true, message: "Đổi mật khẩu thành công" });
  } catch (e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Lỗi" });
  } finally {
    client.release();
  }
});

router.post("/logout", async (req, res) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.json({ ok: true });

    // 1. Giải mã để lấy thời gian hết hạn của Token
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return res.json({ ok: true });

    // 2. Hash token để lưu cho an toàn và tiết kiệm
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expDate = new Date(decoded.exp * 1000);

    // 3. Lưu vào danh sách đen
    await pool.query(
      "INSERT INTO public.token_blacklist (token_hash, het_han_luc) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [tokenHash, expDate],
    );

    return res.json({ ok: true, message: "Đăng xuất thành công" });
  } catch (e) {
    console.error("LOGOUT_ERROR:", e);
    return res.status(500).json({ message: "Lỗi đăng xuất" });
  }
});
module.exports = router;
