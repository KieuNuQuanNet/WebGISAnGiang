const config = require("./config"); // Import config mới

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { pool } = require("./db");
const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Sử dụng config thay cho process.env
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || config.CORS_ORIGINS.includes(origin))
        return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Action", "X-Layer"],
  }),
);
app.use(
  "/myproxy",
  createProxyMiddleware({
    target: config.GEOSERVER_BASE_URL,
    changeOrigin: true,
    pathRewrite: { "^/myproxy": "" },
    logLevel: "warn",
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  express.text({
    type: ["application/xml", "text/xml", "application/*+xml"],
    limit: "5mb",
  }),
);

const authRoutes = require("./routes/auth");
const proxyRoutes = require("./routes/proxy");
const adminRoutes = require("./routes/admin");

app.use("/api", authRoutes); // Kết nối Login, Register...
app.use("/api", proxyRoutes); // Kết nối WFS, WFST...
app.use("/api/admin", adminRoutes); // Kết nối Admin panel
app.use((err, req, res, next) => {
  console.error("GLOBAL_ERROR:", err.stack);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Đã có lỗi hệ thống xảy ra",
  });
});

app.listen(config.PORT, () => {
  console.log(`✅ API running at http://localhost:${config.PORT}`);
});
