const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
// Nếu bạn cần biến ALLOWED, hãy lấy từ process.env hoặc config
const ALLOWED = new Set(
  (process.env.ALLOWED_LAYERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
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
  if (!xml || xml.length > 50000) {
    // Giới hạn 50KB cho một yêu cầu edit
    return res
      .status(400)
      .json({ message: "Bản tin quá lớn hoặc không hợp lệ" });
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

router.post(
  "/wfst",
  authenticateToken,
  validateWfstRequest,
  async (req, res) => {
    try {
      const { action, xml } = req.wfst;
      const roles = req.user?.roles || [];

      // CHỐT CHẶN BẢO MẬT: Chỉ Admin mới được thực thi lệnh DELETE vật lý
      if (action === "delete" && !roles.includes("admin")) {
        return res.status(403).json({
          message:
            "⚠️ Quyền hạn không đủ! Cán bộ chỉ được 'Yêu cầu xóa', không được xóa vĩnh viễn.",
        });
      }
      const need = permForAction(action);
      const perms = req.user?.permissions || [];
      if (!roles.includes("admin") && !perms.includes(need)) {
        return res.status(403).json({ message: "Không đủ quyền" });
      }

      const basic = Buffer.from(
        `${process.env.GEOSERVER_USER}:${process.env.GEOSERVER_PASS}`,
      ).toString("base64");
      const r = await fetch(process.env.GEOSERVER_OWS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          Authorization: `Basic ${basic}`,
        },
        body: xml,
      });

      const text = await r.text();
      return res.status(r.status).send(text);
    } catch (e) {
      console.error("WFST_PROXY_ERROR:", e);
      return res
        .status(500)
        .json({ message: "Proxy error", detail: e.message });
    }
  },
);
// ===== WFS (GetFeature) Proxy - phục vụ click xem thông tin =====
// ===== WFS (GetFeature) Proxy - phục vụ click xem thông tin =====
router.get("/wfs", async (req, res) => {
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
module.exports = router;
