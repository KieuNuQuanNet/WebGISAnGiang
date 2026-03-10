// backend/config.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

module.exports = {
  PORT: process.env.PORT || 3000,
  PG_URL: process.env.PG_URL,
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
  GEOSERVER_BASE_URL:
    process.env.GEOSERVER_BASE_URL || "http://14.225.210.50:8080/geoserver",
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL || "http://localhost:5500",
  CORS_ORIGINS: (
    process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: Number(process.env.SMTP_PORT || 587),
    SECURE: String(process.env.SMTP_SECURE || "false") === "true",
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
    FROM: process.env.SMTP_FROM || process.env.SMTP_USER,
    ENABLED: !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ),
  },
};
