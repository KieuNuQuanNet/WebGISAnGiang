const jwt = require("jsonwebtoken");
const config = require("../config");
const crypto = require("crypto");
async function authenticateToken(req, res, next) {
  const { pool } = require("../db"); // Thêm import db
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    // 1. Kiểm tra Token có nằm trong danh sách đen không
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows } = await pool.query(
      "SELECT 1 FROM public.token_blacklist WHERE token_hash = $1",
      [tokenHash],
    );
    if (rows.length > 0) {
      return res
        .status(401)
        .json({ message: "Token has been revoked (logged out)" });
    }

    // 2. Nếu không nằm trong danh sách đen -> Verify JWT như bình thường
    req.user = jwt.verify(token, config.JWT_SECRET);
    return next();
  } catch (err) {
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

module.exports = { authenticateToken, requirePerm };
