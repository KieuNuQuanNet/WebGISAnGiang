// config.js - cấu hình API base theo môi trường
(() => {
  const h = window.location.hostname;
  const isLocal = h === "localhost" || h === "127.0.0.1";

  // Local dev (Live Server 5500 + Node 3000)
  // Production/VPS (Nginx proxy /api -> Node) => dùng same-origin
  window.WEBGIS_API_BASE = isLocal ? "http://localhost:3000" : "";
})();
