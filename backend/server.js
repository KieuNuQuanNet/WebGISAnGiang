const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ✅ Optional: whitelist layer từ .env (nếu không set thì ALLOWED rỗng => cho phép tất cả)
const ALLOWED = new Set(
  (process.env.ALLOWED_LAYERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

console.log("✅ RUNNING FILE:", __filename);
console.log("✅ APP_PUBLIC_URL (env):", process.env.APP_PUBLIC_URL);
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dns = require("dns").promises;
const nodemailer = require("nodemailer");
const { pool } = require("./db");
const app = express();
app.set("trust proxy", 1);
app.use(helmet());

// ✅ Nhận JSON cho login/register/admin
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Nhận XML raw body cho WFS-T
app.use(
  express.text({
    type: ["application/xml", "text/xml", "application/*+xml"],
    limit: "5mb",
  }),
);

// ===== CORS: cho phép cả localhost và 127.0.0.1 (và có thể cấu hình thêm bằng env) =====
const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5500,http://127.0.0.1:5500"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Action", "X-Layer"],
  }),
);
// =========================================================
// ✅ Proxy GeoServer (thay cho Live Server proxy /myproxy)
// Cho phép Frontend gọi: /myproxy/<workspace>/wms | /myproxy/<workspace>/ows
// =========================================================
const GEOSERVER_BASE =
  process.env.GEOSERVER_BASE_URL || "http://14.225.210.50:8080/geoserver";

app.use(
  "/myproxy",
  createProxyMiddleware({
    target: GEOSERVER_BASE,
    changeOrigin: true,
    secure: false,
    pathRewrite: { "^/myproxy": "" },
    logLevel: "warn",
  }),
);
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ===== EMAIL VERIFY =====
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:5500";

const SMTP_ENABLED = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const mailer = SMTP_ENABLED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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

// MX chỉ “best-effort”
async function hasMxBestEffort(email) {
  const domain = String(email).split("@")[1] || "";
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0; // true/false
  } catch (e) {
    console.warn("MX_CHECK_FAILED:", domain, e.message);
    return null; // DNS lỗi -> không kết luận domain sai
  }
}

async function sendVerifyEmail(toEmail, token) {
  if (!mailer) throw new Error("SMTP chưa cấu hình");

  const verifyLink = `${APP_PUBLIC_URL}/login.html?verify=${encodeURIComponent(token)}`;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to: toEmail,
    subject: "Xác nhận email - WebGIS Tài nguyên An Giang",
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px">
        <p>Chào bạn,</p>
        <p>Vui lòng bấm link để xác nhận email:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <p>Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
      </div>
    `,
  });
}
// ===== Helpers RBAC =====
async function logLoginAttempt({
  req,
  userId = null,
  email = null,
  success,
  reason = null,
}) {
  try {
    const ua = (req.headers["user-agent"] || "").toString().slice(0, 500);
    const ipRaw = (req.headers["x-forwarded-for"] || req.ip || "").toString();
    const ip = ipRaw.split(",")[0].trim().slice(0, 80);

    await pool.query(
      `INSERT INTO public.lich_su_dang_nhap
        (tai_khoan_id, email, thanh_cong, ly_do, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, email, !!success, reason, ip, ua],
    );
  } catch (e) {
    // log không được thì bỏ qua, không làm hỏng login
    console.error("LOGIN_LOG_ERROR:", e.message);
  }
}
async function getUserRolesPermsByEmail(email) {
  const sql = `
    SELECT
      tk.id,
      tk.ho_ten,
      tk.email,
tk.trang_thai,
tk.email_da_xac_nhan,
tk.mat_khau_hash,
      COALESCE(array_agg(DISTINCT vt.ma) FILTER (WHERE vt.ma IS NOT NULL), '{}') AS roles,
      COALESCE(array_agg(DISTINCT q.ma)  FILTER (WHERE q.ma  IS NOT NULL), '{}') AS permissions
    FROM public.tai_khoan tk
    LEFT JOIN public.tai_khoan_vai_tro tkvt ON tkvt.tai_khoan_id = tk.id
    LEFT JOIN public.vai_tro vt            ON vt.id = tkvt.vai_tro_id
    LEFT JOIN public.vai_tro_quyen vtq     ON vtq.vai_tro_id = vt.id
    LEFT JOIN public.quyen q               ON q.id = vtq.quyen_id
    WHERE tk.email = $1
    GROUP BY tk.id;
  `;
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

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}

function requirePerm(code) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    const perms = req.user?.permissions || [];
    if (roles.includes("admin") || perms.includes(code)) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}

// ===== AUTH =====
app.post("/api/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const { ho_ten, email, mat_khau } = req.body || {};

    const hoTen = String(ho_ten || "").trim();
    const em = normalizeEmail(email);
    const mk = String(mat_khau || "");

    if (!hoTen || !em || !mk) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }
    if (!isValidEmailFormat(em)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // MX best-effort (không bắt buộc)
    const mxOk = await hasMxBestEffort(em);
    if (mxOk === false) {
      return res
        .status(400)
        .json({ message: "Email/domain không tồn tại (không có MX)" });
    }

    if (!SMTP_ENABLED) {
      return res
        .status(500)
        .json({ message: "Server chưa cấu hình SMTP để gửi email xác nhận" });
    }

    // Nếu email đã tồn tại mà chưa xác nhận -> gửi lại mail (KHÔNG trả 409)
    const existed = await client.query(
      "SELECT id, email_da_xac_nhan FROM public.tai_khoan WHERE email=$1",
      [em],
    );
    if (existed.rows[0]) {
      if (existed.rows[0].email_da_xac_nhan) {
        return res.status(409).json({ message: "Email đã tồn tại" });
      }

      await client.query("BEGIN");

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      await client.query(
        `
        UPDATE public.tai_khoan
        SET email_xac_nhan_token_hash=$2,
            email_xac_nhan_exp=now() + interval '24 hours',
            email_xac_nhan_sent_at=now()
        WHERE id=$1
        `,
        [existed.rows[0].id, tokenHash],
      );

      // Gửi email trước khi commit (nếu gửi fail -> rollback)
      await sendVerifyEmail(em, token);

      await client.query("COMMIT");
      return res.json({
        ok: true,
        message:
          "Email đã đăng ký nhưng CHƯA xác nhận. Hệ thống đã gửi lại email xác nhận.",
      });
    }

    // Tạo mới
    await client.query("BEGIN");

    const hash = await bcrypt.hash(mk, 10);

    const insertSql = `
      INSERT INTO public.tai_khoan (ho_ten, email, mat_khau_hash, trang_thai, email_da_xac_nhan)
      VALUES ($1, $2, $3, 'cho_duyet', false)
      RETURNING id, ho_ten, email, trang_thai;
    `;
    const { rows } = await client.query(insertSql, [hoTen, em, hash]);
    const userId = rows[0].id;

    await client.query(
      `INSERT INTO public.tai_khoan_vai_tro(tai_khoan_id, vai_tro_id)
       SELECT $1, id FROM public.vai_tro WHERE ma='guest'
       ON CONFLICT DO NOTHING`,
      [userId],
    );

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await client.query(
      `
      UPDATE public.tai_khoan
      SET email_xac_nhan_token_hash=$2,
          email_xac_nhan_exp=now() + interval '24 hours',
          email_xac_nhan_sent_at=now()
      WHERE id=$1
      `,
      [userId, tokenHash],
    );

    // Gửi mail trước khi commit
    await sendVerifyEmail(em, token);

    await client.query("COMMIT");

    return res.json({
      ok: true,
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để XÁC NHẬN, sau đó chờ Admin duyệt.",
      user: rows[0],
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    if (e.code === "23505" || String(e).includes("duplicate key")) {
      return res.status(409).json({ message: "Email đã tồn tại" });
    }
    console.error("REGISTER_ERROR:", e);
    return res.status(500).json({ message: "Server error", detail: e.message });
  } finally {
    client.release();
  }
});
app.get("/api/xac-nhan-email", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) return res.status(400).json({ message: "Thiếu token" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { rows } = await pool.query(
      `
      UPDATE public.tai_khoan
      SET email_da_xac_nhan=true,
          email_xac_nhan_token_hash=NULL,
          email_xac_nhan_exp=NULL
      WHERE email_xac_nhan_token_hash=$1
        AND email_xac_nhan_exp IS NOT NULL
        AND email_xac_nhan_exp > now()
      RETURNING id, email
      `,
      [tokenHash],
    );

    if (!rows[0]) {
      return res
        .status(400)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
    return res.json({ ok: true, message: "✅ Xác nhận email thành công!" });
  } catch (e) {
    console.error("VERIFY_EMAIL_ERROR:", e);
    return res.status(500).json({ message: "Server error", detail: e.message });
  }
});
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};

  try {
    if (!username || !password) {
      await logLoginAttempt({
        req,
        email: username || null,
        success: false,
        reason: "missing_fields",
      });
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    const user = await getUserRolesPermsByEmail(username);
    if (!user) {
      await logLoginAttempt({
        req,
        email: username,
        success: false,
        reason: "user_not_found",
      });
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }
    if (!user.email_da_xac_nhan) {
      return res
        .status(403)
        .json({ message: "Bạn cần xác nhận email trước khi đăng nhập" });
    }
    if (user.trang_thai !== "hoat_dong") {
      await logLoginAttempt({
        req,
        userId: user.id,
        email: user.email,
        success: false,
        reason: "not_active",
      });
      return res
        .status(403)
        .json({ message: "Tài khoản chưa được duyệt hoặc đã bị khóa" });
    }

    const ok = await bcrypt.compare(password, user.mat_khau_hash || "");
    if (!ok) {
      await logLoginAttempt({
        req,
        userId: user.id,
        email: user.email,
        success: false,
        reason: "wrong_password",
      });
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    // ✅ Login thành công
    await logLoginAttempt({
      req,
      userId: user.id,
      email: user.email,
      success: true,
      reason: null,
    });

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      ho_ten: user.ho_ten,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    });
  } catch (e) {
    await logLoginAttempt({
      req,
      email: username || null,
      success: false,
      reason: "server_error",
    });
    console.error("LOGIN_ERROR:", e);
    return res.status(500).json({ message: "Server error", detail: e.message });
  }
});

function validateWfstRequest(req, res, next) {
  const action = (req.headers["x-action"] || "").toString().toLowerCase(); // insert|update|delete
  const layer = (req.headers["x-layer"] || "").toString();

  if (!["insert", "update", "delete"].includes(action)) {
    return res
      .status(400)
      .json({ message: "X-Action phải là insert|update|delete" });
  }
  if (!layer || (ALLOWED.size > 0 && !ALLOWED.has(layer))) {
    return res
      .status(400)
      .json({ message: "Layer không hợp lệ hoặc không được phép" });
  }

  const xml = typeof req.body === "string" ? req.body.trim() : "";
  if (!xml || !xml.includes("<wfs:Transaction") || xml.length < 50) {
    return res.status(400).json({ message: "Body XML không hợp lệ" });
  }

  if (action === "insert" && !xml.includes("<wfs:Insert"))
    return res.status(400).json({ message: "XML không phải Insert" });
  // ✅ chống đánh tráo layer trong XML
  if (
    (action === "update" || action === "delete") &&
    !xml.includes(`typeName="${layer}"`)
  ) {
    return res
      .status(400)
      .json({ message: "typeName trong XML không khớp X-Layer" });
  }
  if (
    action === "insert" &&
    !xml.includes(`<${layer.split(":")[1]}`) &&
    !xml.includes(`<${layer}`)
  ) {
    // (tùy cách bạn tạo tag nsPrefix) — tối thiểu nên check layer name xuất hiện
    return res
      .status(400)
      .json({ message: "XML Insert không khớp layer (thiếu tag layer)" });
  }
  if (action === "delete" && !xml.includes("<wfs:Delete"))
    return res.status(400).json({ message: "XML không phải Delete" });

  req.wfst = { action, layer, xml };
  next();
}

function permForAction(action) {
  if (action === "insert") return "feature.insert";
  if (action === "update") return "feature.update";
  return "feature.delete";
}

app.post("/api/wfst", authRequired, validateWfstRequest, async (req, res) => {
  try {
    const { action, xml } = req.wfst;
    const need = permForAction(action);

    const roles = req.user?.roles || [];
    const perms = req.user?.permissions || [];
    if (!roles.includes("admin") && !perms.includes(need)) {
      return res.status(403).json({ message: "Không đủ quyền" });
    }

    const basic = Buffer.from(
      `${process.env.GEOSERVER_USER}:${process.env.GEOSERVER_PASS}`,
    ).toString("base64");
    const r = await fetch(process.env.GEOSERVER_OWS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", Authorization: `Basic ${basic}` },
      body: xml,
    });

    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (e) {
    console.error("WFST_PROXY_ERROR:", e);
    return res.status(500).json({ message: "Proxy error", detail: e.message });
  }
});
// ===== WFS (GetFeature) Proxy - phục vụ click xem thông tin =====
// ===== WFS (GetFeature) Proxy - phục vụ click xem thông tin =====
app.get("/api/wfs", async (req, res) => {
  try {
    const typeName = (
      req.query.typeName ||
      req.query.typename ||
      ""
    ).toString();
    const bbox = (req.query.bbox || "").toString();
    const maxFeaturesRaw = Number(req.query.maxFeatures || 5);
    const maxFeatures = Number.isFinite(maxFeaturesRaw)
      ? Math.max(1, Math.min(maxFeaturesRaw, 20))
      : 5;

    if (!typeName) return res.status(400).json({ message: "Thiếu typeName" });

    // ✅ whitelist layer (dùng ALLOWED_LAYERS trong .env)
    if (ALLOWED.size > 0 && !ALLOWED.has(typeName)) {
      return res.status(400).json({ message: "Layer không được phép" });
    }

    // bbox: minx,miny,maxx,maxy,EPSG:4326
    const parts = bbox.split(",").map((s) => s.trim());
    if (parts.length < 4)
      return res.status(400).json({ message: "bbox không hợp lệ" });
    for (let i = 0; i < 4; i++) {
      const n = Number(parts[i]);
      if (!Number.isFinite(n))
        return res.status(400).json({ message: "bbox không hợp lệ" });
    }

    // ✅ chỉ lấy dữ liệu đã công bố
    // ✅ chỉ lấy dữ liệu đã công bố + lọc theo bbox bằng CQL (không gửi param bbox lên GeoServer)
    const minx = Number(parts[0]);
    const miny = Number(parts[1]);
    const maxx = Number(parts[2]);
    const maxy = Number(parts[3]);

    const cql = `(trang_thai_du_lieu='cong_bo') AND BBOX(geom, ${minx}, ${miny}, ${maxx}, ${maxy})`;

    const params = new URLSearchParams({
      service: "WFS",
      version: "1.0.0",
      request: "GetFeature",
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      typeName,
      maxFeatures: String(maxFeatures),
      CQL_FILTER: cql, // ✅ chỉ dùng CQL_FILTER
    });

    const url = `${process.env.GEOSERVER_OWS_URL}?${params.toString()}`;

    const basic = Buffer.from(
      `${process.env.GEOSERVER_USER}:${process.env.GEOSERVER_PASS}`,
    ).toString("base64");

    const r = await fetch(url, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const text = await r.text();

    res.status(r.status);
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "text/plain",
    );
    return res.send(text);
  } catch (e) {
    console.error("WFS_PROXY_ERROR:", e);
    return res.status(500).json({ message: "Proxy error", detail: e.message });
  }
});
app.get(
  "/api/admin/roles",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, ma, ten FROM public.vai_tro ORDER BY id ASC",
    );
    return res.json(rows);
  },
);

app.get(
  "/api/admin/users",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    const sql = `
    SELECT
      tk.id, tk.ho_ten, tk.email, tk.trang_thai, tk.created_at,
      COALESCE(array_agg(DISTINCT vt.ma) FILTER (WHERE vt.ma IS NOT NULL), '{}') AS roles
    FROM public.tai_khoan tk
    LEFT JOIN public.tai_khoan_vai_tro tkvt ON tkvt.tai_khoan_id = tk.id
    LEFT JOIN public.vai_tro vt ON vt.id = tkvt.vai_tro_id
    GROUP BY tk.id
    ORDER BY tk.id ASC;
  `;
    const { rows } = await pool.query(sql);
    return res.json(rows);
  },
);

app.patch(
  "/api/admin/users/:id/status",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { trang_thai } = req.body || {};
    if (!["cho_duyet", "hoat_dong", "khoa"].includes(trang_thai)) {
      return res.status(400).json({ message: "trang_thai không hợp lệ" });
    }
    if (trang_thai === "hoat_dong") {
      const ck = await pool.query(
        "SELECT email_da_xac_nhan FROM public.tai_khoan WHERE id=$1",
        [id],
      );
      if (!ck.rows[0]?.email_da_xac_nhan) {
        return res.status(400).json({
          message: "Chưa xác nhận email, không thể duyệt hoạt động",
        });
      }
    }
    const { rows } = await pool.query(
      "UPDATE public.tai_khoan SET trang_thai=$2 WHERE id=$1 RETURNING id, email, trang_thai",
      [id, trang_thai],
    );
    return res.json({ ok: true, user: rows[0] });
  },
);

app.put(
  "/api/admin/users/:id/roles",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    const roles = (req.body?.roles || []).map(String);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM public.tai_khoan_vai_tro WHERE tai_khoan_id=$1",
        [id],
      );

      if (roles.length) {
        const r = await client.query(
          "SELECT id, ma FROM public.vai_tro WHERE ma = ANY($1::text[])",
          [roles],
        );
        for (const row of r.rows) {
          await client.query(
            "INSERT INTO public.tai_khoan_vai_tro(tai_khoan_id, vai_tro_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [id, row.id],
          );
        }
      }

      await client.query("COMMIT");
      return res.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      return res
        .status(500)
        .json({ message: "Server error", detail: e.message });
    } finally {
      client.release();
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (req.user?.sub === id)
      return res
        .status(400)
        .json({ message: "Không thể tự xóa tài khoản đang đăng nhập" });

    await pool.query("DELETE FROM public.tai_khoan WHERE id=$1", [id]);
    return res.json({ ok: true });
  },
);
app.get(
  "/api/admin/layers",
  authRequired,
  requirePerm("admin.users"),
  (req, res) => {
    const items = Object.keys(LAYER_META).map((layer) => ({
      layer,
      table: LAYER_META[layer].table,
      label: LAYER_META[layer].label || layer,
    }));
    res.json(items);
  },
);
app.get(
  "/api/admin/layer-objects",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const layer = String(req.query.layer || "");
      const meta = LAYER_META[layer];
      if (!meta) return res.status(400).json({ message: "Layer không hợp lệ" });

      const table = meta.table;
      const q = String(req.query.q || "").trim();
      const status = String(req.query.status || "all").trim(); // all|nhap|cho_duyet|da_duyet|cong_bo|tu_choi
      const limit = Math.min(Number(req.query.limit || 50), 200);
      const page = Math.max(Number(req.query.page || 1), 1);
      const offset = (page - 1) * limit;

      const labelCol = meta.labelCol || (await pickLabelColumn(table));

      const where = [];
      const params = [];

      if (status !== "all") {
        params.push(status);
        where.push(`t.trang_thai_du_lieu = $${params.length}`);
      }
      if (q && labelCol) {
        params.push(`%${q}%`);
        where.push(`CAST(t.${labelCol} AS TEXT) ILIKE $${params.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // total
      const countSql = `SELECT COUNT(*)::int AS total FROM public.${table} t ${whereSql};`;
      const countRes = await pool.query(countSql, params);
      const total = countRes.rows[0]?.total || 0;

      // items
      params.push(limit);
      params.push(offset);

      const selectLabel = labelCol
        ? `t.${labelCol} AS ten`
        : `NULL::text AS ten`;

      const sql = `
        SELECT
          t.id,
          ${selectLabel},
          t.trang_thai_du_lieu,
          t.ngay_tao, t.nguoi_tao,
          t.ngay_cap_nhat, t.nguoi_cap_nhat,
          t.ngay_phe_duyet, t.nguoi_phe_duyet,
          t.ngay_cong_bo, t.nguoi_cong_bo,
          t.ly_do_tu_choi,
          u1.ho_ten AS ten_nguoi_tao,
          u2.ho_ten AS ten_nguoi_cap_nhat,
          u3.ho_ten AS ten_nguoi_phe_duyet,
          u4.ho_ten AS ten_nguoi_cong_bo
        FROM public.${table} t
        LEFT JOIN public.tai_khoan u1 ON u1.id = t.nguoi_tao
        LEFT JOIN public.tai_khoan u2 ON u2.id = t.nguoi_cap_nhat
        LEFT JOIN public.tai_khoan u3 ON u3.id = t.nguoi_phe_duyet
        LEFT JOIN public.tai_khoan u4 ON u4.id = t.nguoi_cong_bo
        ${whereSql}
        ORDER BY COALESCE(t.ngay_cong_bo, t.ngay_phe_duyet, t.ngay_cap_nhat, t.ngay_tao) DESC NULLS LAST
        LIMIT $${params.length - 1} OFFSET $${params.length};
      `;

      const { rows } = await pool.query(sql, params);
      return res.json({
        layer,
        table,
        labelCol,
        page,
        limit,
        total,
        items: rows,
      });
    } catch (e) {
      console.error(e);
      return res
        .status(500)
        .json({ message: "Lỗi lấy danh sách đối tượng", detail: e.message });
    }
  },
);
app.patch(
  "/api/admin/layer-objects/stage",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const { layer, ids, stage, reason } = req.body || {};
      const meta = LAYER_META[layer];
      if (!meta) return res.status(400).json({ message: "Layer không hợp lệ" });

      // ép kiểu userId + ids
      const userId = Number(req.user?.sub);
      if (!Number.isFinite(userId)) {
        return res.status(401).json({ message: "Token không hợp lệ (sub)" });
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Thiếu ids" });
      }
      const idsInt = ids.map((v) => Number(v));
      if (idsInt.some((v) => !Number.isFinite(v))) {
        return res
          .status(400)
          .json({ message: "ids không hợp lệ (phải là số)" });
      }

      const table = meta.table;

      // map dùng $1 (userId). tu_choi dùng thêm $2 (reason)
      const map = {
        nhap: {
          status: "nhap",
          set: "nguoi_tao=$1::int, ngay_tao=COALESCE(ngay_tao, now()), ly_do_tu_choi=NULL",
          needsReason: false,
        },
        cho_duyet: {
          status: "cho_duyet",
          set: "nguoi_cap_nhat=$1::int, ngay_cap_nhat=now(), ly_do_tu_choi=NULL",
          needsReason: false,
        },
        da_duyet: {
          status: "da_duyet",
          set: "nguoi_phe_duyet=$1::int, ngay_phe_duyet=now(), ly_do_tu_choi=NULL",
          needsReason: false,
        },
        cong_bo: {
          status: "cong_bo",
          set: "nguoi_cong_bo=$1::int, ngay_cong_bo=now()",
          needsReason: false,
        },
        tu_choi: {
          status: "tu_choi",
          set: "nguoi_phe_duyet=$1::int, ngay_phe_duyet=now(), ly_do_tu_choi=$2::text",
          needsReason: true,
        },
      };

      const cfg = map[stage];
      if (!cfg) return res.status(400).json({ message: "stage không hợp lệ" });

      if (cfg.needsReason && !String(reason || "").trim()) {
        return res.status(400).json({ message: "Thiếu lý do từ chối" });
      }

      // ✅ tham số KHÔNG nhảy cóc: ids bắt đầu từ $2 hoặc $3
      let placeholders = "";
      let params = [];

      if (stage === "tu_choi") {
        placeholders = idsInt.map((_, i) => `$${i + 3}`).join(",");
        params = [userId, String(reason || ""), ...idsInt];
      } else {
        placeholders = idsInt.map((_, i) => `$${i + 2}`).join(",");
        params = [userId, ...idsInt];
      }

      const sql = `
        UPDATE public.${table}
        SET trang_thai_du_lieu='${cfg.status}', ${cfg.set}
        WHERE id IN (${placeholders})
        RETURNING id, trang_thai_du_lieu;
      `;

      const { rows } = await pool.query(sql, params);
      return res.json({ ok: true, updated: rows.length, rows });
    } catch (e) {
      console.error("PATCH /api/admin/layer-objects/stage FAILED:", e);
      return res.status(500).json({
        message: "Lỗi cập nhật trạng thái",
        detail: e.message,
      });
    }
  },
);
/**************************************************
 * WORKFLOW + LỊCH SỬ CẬP NHẬT (DÙNG CHUNG MỌI LỚP)
 **************************************************/

// 1) Map layer (GeoServer) -> table (Postgres)
const LAYER_TABLE_MAP = {
  "angiang:rung": "rung",
  "angiang:dat": "dat",
  "angiang:khoangsan_diem_mo": "khoangsan_diem_mo",
  "angiang:thucvat": "thucvat_ag",
  "angiang:dongvat": "dongvat_ag",
  "angiang:waterways": "waterways",
};

// 2) Admin xem lịch sử theo layer (feature-level)
app.get(
  "/api/admin/history",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const { layer } = req.query;
      const table = layer ? LAYER_TABLE_MAP[layer] : null;
      if (!table) {
        return res
          .status(400)
          .json({ message: "Thiếu hoặc sai ?layer=workspace:layer" });
      }

      const q = `
        SELECT
          t.id,
          t.trang_thai_du_lieu,
          t.ngay_tao, t.nguoi_tao,
          t.ngay_cap_nhat, t.nguoi_cap_nhat,
          t.ngay_phe_duyet, t.nguoi_phe_duyet,
          t.ngay_cong_bo, t.nguoi_cong_bo,
          t.ly_do_tu_choi,

          u1.ho_ten AS ten_nguoi_tao,
          u2.ho_ten AS ten_nguoi_cap_nhat,
          u3.ho_ten AS ten_nguoi_phe_duyet,
          u4.ho_ten AS ten_nguoi_cong_bo
        FROM public.${table} t
        LEFT JOIN public.tai_khoan u1 ON u1.id = t.nguoi_tao
        LEFT JOIN public.tai_khoan u2 ON u2.id = t.nguoi_cap_nhat
        LEFT JOIN public.tai_khoan u3 ON u3.id = t.nguoi_phe_duyet
        LEFT JOIN public.tai_khoan u4 ON u4.id = t.nguoi_cong_bo
        ORDER BY COALESCE(t.ngay_cong_bo, t.ngay_phe_duyet, t.ngay_cap_nhat, t.ngay_tao) DESC NULLS LAST
        LIMIT 1000;
      `;
      const { rows } = await pool.query(q);
      return res.json(rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
  },
);

app.patch("/api/workflow/set-stage", authRequired, async (req, res) => {
  try {
    const { layer, ids, stage, reason } = req.body || {};
    const table = LAYER_TABLE_MAP[layer];

    if (!table) return res.status(400).json({ message: "Layer không hợp lệ" });
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "Thiếu ids" });

    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId))
      return res.status(401).json({ message: "Token không hợp lệ (sub)" });

    const idsInt = ids.map((v) => Number(v));
    if (idsInt.some((v) => !Number.isFinite(v))) {
      return res.status(400).json({ message: "ids không hợp lệ (phải là số)" });
    }

    const roles = req.user?.roles || [];
    const perms = req.user?.permissions || [];
    const isAdmin = roles.includes("admin") || perms.includes("admin.users");
    const isStaff =
      isAdmin ||
      perms.includes("feature.insert") ||
      perms.includes("feature.update") ||
      perms.includes("feature.delete");

    const map = {
      nhap: {
        status: "nhap",
        set: "nguoi_tao=$1::int, ngay_tao=COALESCE(ngay_tao, now()), ly_do_tu_choi=NULL",
        needsReason: false,
      },
      cho_duyet: {
        status: "cho_duyet",
        set: "nguoi_cap_nhat=$1::int, ngay_cap_nhat=now(), ly_do_tu_choi=NULL",
        needsReason: false,
      },
      da_duyet: {
        status: "da_duyet",
        set: "nguoi_phe_duyet=$1::int, ngay_phe_duyet=now(), ly_do_tu_choi=NULL",
        needsReason: false,
      },
      cong_bo: {
        status: "cong_bo",
        set: "nguoi_cong_bo=$1::int, ngay_cong_bo=now()",
        needsReason: false,
      },
      tu_choi: {
        status: "tu_choi",
        set: "nguoi_phe_duyet=$1::int, ngay_phe_duyet=now(), ly_do_tu_choi=$2::text",
        needsReason: true,
      },
    };

    const cfg = map[stage];
    if (!cfg) return res.status(400).json({ message: "stage không hợp lệ" });

    if (["da_duyet", "cong_bo", "tu_choi"].includes(stage) && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Chỉ admin được duyệt/công bố/từ chối" });
    }
    if (["nhap", "cho_duyet"].includes(stage) && !isStaff) {
      return res.status(403).json({ message: "Không đủ quyền cập nhật" });
    }
    if (cfg.needsReason && !String(reason || "").trim()) {
      return res.status(400).json({ message: "Thiếu lý do từ chối" });
    }

    let placeholders = "";
    let params = [];

    if (stage === "tu_choi") {
      placeholders = idsInt.map((_, i) => `$${i + 3}`).join(",");
      params = [userId, String(reason || ""), ...idsInt];
    } else {
      placeholders = idsInt.map((_, i) => `$${i + 2}`).join(",");
      params = [userId, ...idsInt];
    }

    const q = `
      UPDATE public.${table}
      SET trang_thai_du_lieu='${cfg.status}', ${cfg.set}
      WHERE id IN (${placeholders})
      RETURNING id, trang_thai_du_lieu;
    `;

    const { rows } = await pool.query(q, params);
    return res.json({ updated: rows.length, rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi workflow", detail: e.message });
  }
});
// ===== Start =====
app.get("/api/_ping", (req, res) => {
  res.json({ ok: true, file: __filename, time: new Date().toISOString() });
});
app.get(
  "/api/admin/resource-history",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const q = (req.query.q || "").toString().trim();
      const limit = Math.min(Number(req.query.limit || 200), 1000);

      // label “thông minh” không phụ thuộc cột có tồn tại hay không
      const labelExpr = `
  COALESCE(
    to_jsonb(t)->>'ten_tai_nguyen',
    to_jsonb(t)->>'ten',
    to_jsonb(t)->>'ten_don_vi',
    to_jsonb(t)->>'ten_khoang_san',
    to_jsonb(t)->>'ten_loai',
    to_jsonb(t)->>'name',
    ('ID '||t.id::text)
  )
`;

      // tạo UNION ALL từ LAYER_META
      const parts = Object.entries(LAYER_META).map(
        ([layer, meta]) => `
  SELECT
    t.id,
    ${labelExpr} AS ten_tai_nguyen,
    '${layer}'::text AS ma_lop,
    t.trang_thai_du_lieu,
    t.ly_do_tu_choi,
    t.ngay_tao, t.nguoi_tao,
    t.ngay_cap_nhat, t.nguoi_cap_nhat,
    t.ngay_phe_duyet, t.nguoi_phe_duyet,
    t.ngay_cong_bo, t.nguoi_cong_bo
  FROM public.${meta.table} t
`,
      );

      const sql = `
  WITH x AS (
    ${parts.join("\nUNION ALL\n")}
  )
  SELECT
    x.*,
    u1.ho_ten AS ten_nguoi_tao,
    u2.ho_ten AS ten_nguoi_cap_nhat,
    u3.ho_ten AS ten_nguoi_phe_duyet,
    u4.ho_ten AS ten_nguoi_cong_bo
  FROM x
  LEFT JOIN public.tai_khoan u1 ON u1.id = x.nguoi_tao
  LEFT JOIN public.tai_khoan u2 ON u2.id = x.nguoi_cap_nhat
  LEFT JOIN public.tai_khoan u3 ON u3.id = x.nguoi_phe_duyet
  LEFT JOIN public.tai_khoan u4 ON u4.id = x.nguoi_cong_bo
  WHERE ($1 = '' OR x.ten_tai_nguyen ILIKE '%'||$1||'%' OR x.ma_lop ILIKE '%'||$1||'%')
  ORDER BY COALESCE(x.ngay_cong_bo, x.ngay_phe_duyet, x.ngay_cap_nhat, x.ngay_tao) DESC NULLS LAST
  LIMIT $2;
`;

      const { rows } = await pool.query(sql, [q, limit]);
      return res.json(rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Lỗi lấy lịch sử cập nhật" });
    }
  },
);
app.patch(
  "/api/admin/resource-history/:id/stage",
  authRequired,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { stage, reason } = req.body || {};
      const userId = req.user.sub;

      const map = {
        nhap: {
          status: "nhap",
          set: "nguoi_tao=$2, ngay_tao=COALESCE(ngay_tao, now())",
        },
        cho_duyet: {
          status: "cho_duyet",
          set: "nguoi_cap_nhat=$2, ngay_cap_nhat=now(), ly_do_tu_choi=NULL",
        },
        da_duyet: {
          status: "da_duyet",
          set: "nguoi_phe_duyet=$2, ngay_phe_duyet=now(), ly_do_tu_choi=NULL",
        },
        cong_bo: {
          status: "cong_bo",
          set: "nguoi_cong_bo=$2, ngay_cong_bo=now()",
        },
        tu_choi: {
          status: "tu_choi",
          set: "nguoi_phe_duyet=$2, ngay_phe_duyet=now(), ly_do_tu_choi=$3",
        },
      };

      if (!map[stage])
        return res.status(400).json({ message: "stage không hợp lệ" });

      const sql = `
        UPDATE public.lich_su_cap_nhat
        SET trang_thai_du_lieu='${map[stage].status}', ${map[stage].set}
        WHERE id=$1
        RETURNING *;
      `;
      const { rows } = await pool.query(sql, [id, userId, reason || null]);
      if (!rows[0])
        return res.status(404).json({ message: "Không tìm thấy tài nguyên" });

      return res.json({ ok: true, row: rows[0] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Lỗi cập nhật workflow" });
    }
  },
);
// Layer -> Postgres table (chỉ cho phép các bảng này)
const LAYER_META = {
  // ✅ khớp với script.js đang insert bằng WORKSPACE = "angiang"
  "angiang:rung": { table: "rung", label: "Rừng" },
  "angiang:dat": { table: "dat", label: "Đất" },
  "angiang:khoangsan_diem_mo": {
    table: "khoangsan_diem_mo",
    label: "Khoáng sản (điểm mỏ)",
  },

  // ✅ layer name trên map là "dongvat" / "thucvat"
  // table vẫn giữ như bạn đang dùng trong DB (ag) nếu đó là tên bảng thật
  "angiang:thucvat": {
    table: "thucvat_ag",
    label: "Thực vật",
    labelCol: "ten_loai",
  },
  "angiang:dongvat": {
    table: "dongvat_ag",
    label: "Động vật",
    labelCol: "ten_loai",
  },

  "angiang:waterways": { table: "waterways", label: "Sông ngòi" },
};

// Tự chọn “cột tên” để hiển thị (nếu bảng nào có)
const LABEL_CANDIDATES = [
  "ten",
  "name",
  "ten_don_vi",
  "ten_tai_nguyen",
  "ten_khoang_san",
  "loai",
  "ma",
];

async function pickLabelColumn(table) {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  const cols = new Set(rows.map((r) => r.column_name));
  const found = LABEL_CANDIDATES.find((c) => cols.has(c));
  return found || null; // null => chỉ hiển thị ID
}
async function sendResetPasswordEmail(toEmail, token) {
  if (!mailer) throw new Error("SMTP chưa cấu hình");

  const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:5500";

  const resetLink = `${APP_PUBLIC_URL}/login.html?reset=${encodeURIComponent(token)}`;
  console.log("✅ Reset link being sent:", resetLink);

  await mailer.sendMail({
    to: toEmail,
    subject: "Đặt lại mật khẩu - WebGIS",
    html: `
    Bấm link sau để đổi mật khẩu:
    <a href="${resetLink}">${resetLink}</a>
  `,
  });
}
app.post("/api/forgot-password", async (req, res) => {
  const client = await pool.connect();
  try {
    const email = normalizeEmail(req.body?.email);

    // trả chung để tránh dò email có tồn tại hay không
    const okMessage =
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả Spam).";

    if (!email || !isValidEmailFormat(email)) {
      return res.json({ ok: true, message: okMessage });
    }

    const ua = String(req.headers["user-agent"] || "").slice(0, 500);
    const ipRaw = String(req.headers["x-forwarded-for"] || req.ip || "");
    const ip = ipRaw.split(",")[0].trim().slice(0, 80);

    const { rows } = await client.query(
      "SELECT id, email FROM public.tai_khoan WHERE email=$1",
      [email],
    );

    // không tồn tại -> vẫn trả ok
    if (!rows[0]) return res.json({ ok: true, message: okMessage });

    const userId = rows[0].id;

    await client.query("BEGIN");

    // xóa token reset cũ chưa dùng (đơn giản hóa)
    await client.query(
      "DELETE FROM public.token_quen_mat_khau WHERE tai_khoan_id=$1 AND da_su_dung_luc IS NULL",
      [userId],
    );

    // tạo token gốc + hash để lưu DB
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const ttlMin = Number(process.env.RESET_PASSWORD_TTL_MIN || 30);

    await client.query(
      `
      INSERT INTO public.token_quen_mat_khau
        (tai_khoan_id, token_ma_hoa, het_han_luc, ip_yeu_cau, trinh_duyet)
      VALUES ($1, $2, now() + ($3 || ' minutes')::interval, $4, $5)
      `,
      [userId, tokenHash, String(ttlMin), ip, ua],
    );

    await sendResetPasswordEmail(email, token);

    await client.query("COMMIT");
    return res.json({ ok: true, message: okMessage });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error(e);
    return res.status(500).json({ message: "Lỗi server", detail: e.message });
  } finally {
    client.release();
  }
});
app.post("/api/reset-password", async (req, res) => {
  const client = await pool.connect();
  try {
    const token = String(req.body?.token || "").trim();
    const email = normalizeEmail(req.body?.email);
    const newPassword = String(req.body?.new_password || "");

    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }
    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT tq.id AS token_id, tk.id AS user_id
      FROM public.token_quen_mat_khau tq
      JOIN public.tai_khoan tk ON tk.id = tq.tai_khoan_id
      WHERE tk.email=$1
        AND tq.token_ma_hoa=$2
        AND tq.da_su_dung_luc IS NULL
        AND tq.het_han_luc > now()
      LIMIT 1
      `,
      [email, tokenHash],
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Link không hợp lệ hoặc đã hết hạn" });
    }

    const userId = rows[0].user_id;
    const tokenId = rows[0].token_id;

    const hash = await bcrypt.hash(newPassword, 10);

    await client.query(
      "UPDATE public.tai_khoan SET mat_khau_hash=$2 WHERE id=$1",
      [userId, hash],
    );

    await client.query(
      "UPDATE public.token_quen_mat_khau SET da_su_dung_luc=now() WHERE id=$1",
      [tokenId],
    );

    await client.query("COMMIT");
    return res.json({
      ok: true,
      message: "✅ Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.",
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error(e);
    return res.status(500).json({ message: "Lỗi server", detail: e.message });
  } finally {
    client.release();
  }
});
app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ API running at http://localhost:${process.env.PORT || 3000}`);
});
