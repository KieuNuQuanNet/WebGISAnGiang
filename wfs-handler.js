// ✅ Popup chuẩn (GIỐNG popup khi bật lớp tài nguyên và click)
function taoPopupThongTin(feature, tieuDe, layerName, layerObj) {
  const featureId = feature?.id;
  const props = feature?.properties || {};

  const block = document.createElement("div");
  block.className = "info-popup";

  let htmlInfo = `<h4>Thông tin ${tieuDe}</h4>`;

  for (const key in props) {
    if (
      key !== "bbox" &&
      key !== "geom" &&
      key !== "id" &&
      !WF_SYSTEM_FIELDS.has(key) &&
      props[key] !== null &&
      props[key] !== ""
    ) {
      const tenHienThi = TU_DIEN_COT[key] || key;
      htmlInfo += `<p><b>${tenHienThi}:</b> <span class="val-display">${props[key]}</span></p>`;
    }
  }

  const coThaoTac = !!(layerName && layerObj && featureId);

  const canEdit =
    coThaoTac &&
    (hasPerm("admin.users") ||
      hasPerm("feature.update") ||
      hasPerm("feature.insert"));

  const canDelete =
    coThaoTac &&
    (hasPerm("admin.users") ||
      hasPerm("feature.delete") ||
      hasPerm("feature.insert"));

  if (canEdit || canDelete) {
    htmlInfo += `<div class="popup-actions">`;
    if (canEdit)
      htmlInfo += `<button class="btn-popup btn-edit">✏️ SỬA</button>`;

    if (canDelete && !isAdmin()) {
      htmlInfo += `<button class="btn-popup btn-request-delete bg-orange">⚠️ YÊU CẦU XÓA</button>`;
    }
    htmlInfo += `</div>`;
  }

  block.innerHTML = htmlInfo;
  L.DomEvent.disableClickPropagation(block);
  L.DomEvent.disableScrollPropagation(block);

  if (canDelete) {
    block
      .querySelector(".btn-request-delete")
      ?.addEventListener("click", function (ev) {
        L.DomEvent.stop(ev);
        const lyDo = prompt(
          "⚠️ Vui lòng nhập lý do bạn muốn yêu cầu xóa tài nguyên này:",
          "",
        );
        if (lyDo === null) return;
        if (lyDo.trim() === "") {
          showToast("Bạn phải nhập lý do để Admin phê duyệt!", "error");
          return;
        }

        const updatedProps = {
          trang_thai_du_lieu: "cho_xoa",
          ly_do: `[YÊU CẦU XÓA]: ${lyDo}`,
          ngay_cap_nhat: nowIsoNoTZ(),
          nguoi_cap_nhat: String(getUserIdFromToken()),
        };
        suaDuLieuWFS(layerName, featureId, updatedProps, layerObj);
        showToast("✅ Đã gửi yêu cầu xóa đến Admin!");
      });
  }

  if (canEdit) {
    block.querySelector(".btn-edit")?.addEventListener("click", function (ev) {
      L.DomEvent.stop(ev);
      moFormSuaDoi(block, layerName, featureId, props, layerObj);
    });
  }

  return block;
}

// =====================================================================
// GIAI ĐOẠN 2: CLICK LẤY THÔNG TIN & SỬA XÓA (WFS GETFEATURE & WFS-T)
// =====================================================================
function fetchWFS(urlWFS, typeName, tieuDe, layerObj) {
  return fetch(urlWFS + "&typeName=" + encodeURIComponent(typeName))
    .then(async (res) => {
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      // Nếu GeoServer trả XML/HTML (ExceptionReport/ServiceException), log ra luôn
      if (!ct.includes("application/json")) {
        console.warn("WFS không phải JSON:", typeName, ct, text.slice(0, 300));
        return null;
      }

      const data = JSON.parse(text);
      if (data.features && data.features.length > 0) {
        return {
          feature: data.features[0],
          layerName: typeName,
          layerObj,
          tieuDe,
        };
      }
      return null;
    })
    .catch((e) => {
      console.warn("WFS lỗi fetch:", typeName, e);
      return null;
    });
}
AppGIS.map.on("click", function (e) {
  // ✅ tolerance theo pixel để click ổn định theo mọi mức zoom
  const pxTol = 8;
  const p = AppGIS.map.latLngToContainerPoint(e.latlng);
  const p1 = L.point(p.x - pxTol, p.y - pxTol);
  const p2 = L.point(p.x + pxTol, p.y + pxTol);
  const ll1 = AppGIS.map.containerPointToLatLng(p1);
  const ll2 = AppGIS.map.containerPointToLatLng(p2);

  const minx = Math.min(ll1.lng, ll2.lng);
  const miny = Math.min(ll1.lat, ll2.lat);
  const maxx = Math.max(ll1.lng, ll2.lng);
  const maxy = Math.max(ll1.lat, ll2.lat);

  const promises = [];

  // ✅ ĐỔI sang gọi backend proxy WFS (ổn định hơn / không sợ GeoServer chặn WFS anonymous)
  const urlWFSBase =
    `${API_BASE}/api/wfs` +
    `?bbox=${minx},${miny},${maxx},${maxy},EPSG:4326` +
    `&maxFeatures=5`;

  // helper: fetch WFS và bắt lỗi rõ ràng
  function fetch1(typeName, layerObj, tieuDe) {
    return fetch(urlWFSBase + `&typeName=${encodeURIComponent(typeName)}`)
      .then(async (res) => {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const text = await res.text();
        if (!res.ok)
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        if (!ct.includes("application/json")) {
          // GeoServer hay trả XML ServiceException -> ct không phải json
          throw new Error(`Không phải JSON: ${text.slice(0, 200)}`);
        }
        return JSON.parse(text);
      })
      .then((data) => {
        if (data.features && data.features.length > 0) {
          return {
            feature: data.features[0],
            layerName: typeName,
            layerObj,
            tieuDe,
          };
        }
        return null;
      })
      .catch((err) => ({
        __error: true,
        typeName,
        tieuDe,
        message: err.message,
      }));
  }

  // 1) Dò tìm trên các lớp đang hiển thị
  if (AppGIS.map.hasLayer(AppGIS.layers.khoangsan))
    promises.push(
      fetch1(
        "angiang:khoangsan_diem_mo",
        AppGIS.layers.khoangsan,
        "Khoáng sản",
      ),
    );
  if (AppGIS.map.hasLayer(AppGIS.layers.rung))
    promises.push(fetch1("angiang:rung", AppGIS.layers.rung, "Rừng"));
  if (AppGIS.map.hasLayer(AppGIS.layers.nuoc))
    promises.push(fetch1("angiang:waterways", AppGIS.layers.nuoc, "Nước"));
  if (AppGIS.map.hasLayer(AppGIS.layers.dat))
    promises.push(fetch1("angiang:dat", AppGIS.layers.dat, "Đất"));
  if (AppGIS.map.hasLayer(AppGIS.layers.dongvat))
    promises.push(fetch1("angiang:dongvat", AppGIS.layers.dongvat, "Động vật"));
  if (AppGIS.map.hasLayer(AppGIS.layers.thucvat))
    promises.push(fetch1("angiang:thucvat", AppGIS.layers.thucvat, "Thực vật"));

  // 2) Xử lý kết quả + popup
  Promise.all(promises).then((results) => {
    const validResults = results.filter((r) => r && !r.__error);

    if (validResults.length === 0) {
      AppGIS.map.closePopup();
      return;
    }

    // Lấy đối tượng tìm thấy đầu tiên
    const item = validResults[0];
    const feature = item.feature;
    const props = feature.properties || {};
    const featureId = feature.id;

    // Tạo nội dung Popup (Dùng hàm dùng chung đã có của bạn)
    const block = taoPopupThongTin(
      feature,
      item.tieuDe,
      item.layerName,
      item.layerObj,
    );

    // Hiển thị Popup lên bản đồ AppGIS.map
    L.popup().setLatLng(e.latlng).setContent(block).openOn(AppGIS.map);
    L.DomEvent.disableClickPropagation(block);
    L.DomEvent.disableScrollPropagation(block);

    L.popup().setLatLng(e.latlng).setContent(block).openOn(AppGIS.map);
  });
});

// =====================================================================
// HÀM 1: BIẾN POPUP THÀNH FORM SỬA CHỮA (CÓ DÙNG TỪ ĐIỂN)
// =====================================================================
const ENUM_OPTIONS = {
  loai_rung: ["Rừng phòng hộ", "Rừng đặc dụng", "Rừng sản xuất"],
  tinh_trang: [
    "Chưa xác định",
    "Ổn định - Bảo vệ",
    "Cảnh báo cháy",
    "Đang cháy",
    "Bị suy thoái",
    "Đang tái sinh",
    "Đã quy hoạch",
    "Chưa khai thác",
    "Đang khai thác",
    "Tạm dừng khai thác",
    "Đóng cửa mỏ",
    "Khu vực cấm khai thác",
    "Khai thác trái phép",
  ],
  loai_dat_su_dung: [
    "Đất chuyên trồng lúa nước",
    "Đất trồng lúa nương",
    "Đất trồng cây hàng năm khác",
    "Đất trồng cây lâu năm",
    "Đất rừng sản xuất",
    "Đất nuôi trồng thủy sản",
    "Đất ở tại đô thị",
    "Đất ở tại nông thôn",
  ],
  nhom_su_dung: ["Đất nông nghiệp", "Đất phi nông nghiệp", "Đất chưa sử dụng"],
  loai: ["kênh", "rạch", "sông"],
  cap: ["chính", "nhánh"],
  loai_khoang_san: [
    "Chưa phân loại",
    "Đá xây dựng",
    "Sét gạch ngói",
    "Cát xây dựng",
    "Cát san lấp",
    "Đất đá san lấp",
    "Đá vôi",
    "Than bùn",
  ],
  muc_do_nguy_cap: [
    "Ít quan tâm (LC)",
    "Sắp nguy cấp (VU)",
    "Nguy cấp (EN)",
    "Cực kỳ nguy cấp (CR)",
  ],
};
const ENUMS_THEO_LOP = {
  "angiang:rung": {
    tinh_trang: [
      "Chưa xác định",
      "Ổn định - Bảo vệ",
      "Cảnh báo cháy",
      "Đang cháy",
      "Bị suy thoái",
      "Đang tái sinh",
    ],
  },
  "angiang:khoangsan_diem_mo": {
    tinh_trang: [
      "Chưa xác định",
      "Đã quy hoạch",
      "Chưa khai thác",
      "Đang khai thác",
      "Tạm dừng khai thác",
      "Đóng cửa mỏ",
      "Khu vực cấm khai thác",
      "Khai thác trái phép",
    ],
  },
};
function moFormSuaDoi(blockElement, layerName, featureId, props, layerObj) {
  var formHtml = `<div class='wfs-form-container'><h4 class="wfs-form-header text-khoangsan">CẬP NHẬT DỮ LIỆU</h4>`;

  for (var key in props) {
    if (
      key !== "bbox" &&
      key !== "geom" &&
      key !== "id" &&
      !WF_SYSTEM_FIELDS.has(key)
    ) {
      var tenHienThi = TU_DIEN_COT[key] || key;
      var currentVal = props[key] || "";

      formHtml += `<div class="wfs-form-group"><label>${tenHienThi}:</label>`;

      // KIỂM TRA: Ưu tiên lấy danh sách theo Lớp (giống cách thằng Đất đang làm)
      let optionsCuaLop =
        ENUMS_THEO_LOP[layerName] && ENUMS_THEO_LOP[layerName][key]
          ? ENUMS_THEO_LOP[layerName][key]
          : ENUM_OPTIONS[key];

      if (optionsCuaLop) {
        formHtml += `<select class='wfs-input edit-input' data-key='${key}'>`;
        optionsCuaLop.forEach((opt) => {
          var selected = String(opt) === String(currentVal) ? "selected" : "";
          formHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
        });
        formHtml += `</select>`;
      } else {
        formHtml += `<input type='text' class='wfs-input edit-input' data-key='${key}' value='${currentVal}'>`;
      }

      formHtml += `</div>`;
    }
  }
  formHtml += `
            <div class="wfs-button-group">
                <button class='wfs-btn wfs-btn-cancel' id='btnHuySua'>HỦY</button>
            <button class='wfs-btn wfs-btn-save bg-khoangsan' id='btnLuuSua'>💾 LƯU LẠI</button>
            </div>
        </div>`;

  blockElement.innerHTML = formHtml;

  blockElement.querySelector("#btnHuySua").addEventListener("click", (e) => {
    L.DomEvent.stop(e);
    AppGIS.map.closePopup();
  });

  blockElement
    .querySelector("#btnLuuSua")
    .addEventListener("click", function (e) {
      L.DomEvent.stop(e);
      this.innerHTML = "⏳ Đang lưu...";
      var updatedProps = {};

      blockElement.querySelectorAll(".edit-input").forEach((input) => {
        const k = input.getAttribute("data-key");
        if (!k || WF_SYSTEM_FIELDS.has(k)) return;
        updatedProps[k] = input.value;
      });

      updatedProps["ngay_cap_nhat"] = nowIsoNoTZ();
      const uid = getUserIdFromToken();
      if (uid !== null) updatedProps["nguoi_cap_nhat"] = String(uid);

      // Tự động xác định trạng thái dựa trên quyền
      const roles = (
        JSON.parse(localStorage.getItem("webgis_roles") || "[]") || []
      ).map((r) => String(r).toLowerCase());
      const perms = JSON.parse(
        localStorage.getItem("webgis_permissions") ||
          localStorage.getItem("webgis_perms") ||
          "[]",
      ).map((p) => String(p).toLowerCase());
      const isAdminUser = roles.includes("admin") || perms.includes("admin");

      updatedProps["trang_thai_du_lieu"] = isAdminUser ? "nhap" : "cho_duyet";

      suaDuLieuWFS(layerName, featureId, updatedProps, layerObj);
    });
}

// =====================================================================
// TUYỆT KỸ WFS-T 1: GỬI LỆNH UPDATE LÊN GEOSERVER (SỬA DỮ LIỆU)
// =====================================================================
// =====================================================================
// AUTH + WFST PROXY (JWT/RBAC)
// =====================================================================
const API_BASE = window.WEBGIS_API_BASE || "";

// ✅ dùng common.js (ẩn/hiện theo quyền + navbar)
applyPermUI?.();
initAuthNav?.();
function xmlEscape(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function nowIsoNoTZ() {
  return new Date().toISOString(); // Gửi giờ chuẩn ISO có chữ Z
}
function wfInsertMetaXml(nsPrefix) {
  // Dùng toISOString() để gửi giờ chuẩn quốc tế có chữ 'Z' ở cuối
  const now = new Date().toISOString();
  const uid = getUserIdFromToken();

  const st = "cho_duyet";

  return `
             <${nsPrefix}:trang_thai_du_lieu>${st}</${nsPrefix}:trang_thai_du_lieu>
            <${nsPrefix}:ngay_tao>${now}</${nsPrefix}:ngay_tao>
            <${nsPrefix}:nguoi_tao>${uid || ""}</${nsPrefix}:nguoi_tao>
            <${nsPrefix}:ngay_cap_nhat>${now}</${nsPrefix}:ngay_cap_nhat>
            <${nsPrefix}:nguoi_cap_nhat>${uid || ""}</${nsPrefix}:nguoi_cap_nhat>
          `;
}

// ✅ check WFST response chuẩn hơn (tránh báo “thành công” giả)
function wfstHasError(respText) {
  return /ExceptionReport|ServiceExceptionReport|<wfs:Status>\s*FAILED/i.test(
    respText,
  );
}
function wfstTotalInserted(respText) {
  const m = respText.match(
    /<wfs:totalInserted>\s*(\d+)\s*<\/wfs:totalInserted>/i,
  );
  return m ? Number(m[1]) : null;
}
async function postWFST(action, layer, xml) {
  const token = getToken();
  if (!token) throw new Error("Bạn chưa đăng nhập!");

  const res = await fetch(`${API_BASE}/api/wfst`, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      Authorization: `Bearer ${token}`,
      "X-Action": action, // insert|update|delete
      "X-Layer": layer, // vd: angiang:dat
    },
    body: xml,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

function suaDuLieuWFS(layerName, featureId, updatedProps, layerObj) {
  const workspace = layerName.split(":")[0];

  // ✅ Namespace URI phải khớp Workspace trong GeoServer (và khớp INSERT của bạn)
  // Nếu GeoServer workspace "angiang" dùng URI khác thì thay ở đây.
  const WORKSPACE_URI = "http://angiang.vn";

  let propXml = "";
  for (const key in updatedProps) {
    propXml += `
      <wfs:Property>
        <wfs:Name>${key}</wfs:Name>
        <wfs:Value>${xmlEscape(updatedProps[key])}</wfs:Value>
      </wfs:Property>
    `;
  }

  const wfsTx = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:ogc="http://www.opengis.net/ogc"
      xmlns:${workspace}="${WORKSPACE_URI}">
      <wfs:Update typeName="${layerName}">
        ${propXml}
        <ogc:Filter>
          <ogc:FeatureId fid="${featureId}"/>
        </ogc:Filter>
      </wfs:Update>
    </wfs:Transaction>
  `;

  postWFST("update", layerName, wfsTx)
    .then((data) => {
      if (
        String(data).includes("Exception") ||
        String(data).includes("Error")
      ) {
        showToast("Lỗi khi sửa dữ liệu!", "error");
        console.log(data);
      } else {
        showToast("✅ Cập nhật dữ liệu thành công!");
        AppGIS.map.closePopup();
        layerObj.setParams({ fake: Date.now() }, false);
      }
    })
    .catch((e) => {
      showToast("❌ Update thất bại: " + e.message);
      console.error(e);
    });
}

// =====================================================================
// TUYỆT KỸ WFS-T 2: GỬI LỆNH DELETE LÊN GEOSERVER (XÓA DỮ LIỆU)
// =====================================================================
function xoaDuLieuWFS(layerName, featureId, layerObj) {
  var wfsTx = `
        <wfs:Transaction service="WFS" version="1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc">
            <wfs:Delete typeName="${layerName}">
                <ogc:Filter>
                    <ogc:FeatureId fid="${featureId}"/>
                </ogc:Filter>
            </wfs:Delete>
        </wfs:Transaction>
    `;

  postWFST("delete", layerName, wfsTx)
    .then((data) => {
      if (data.includes("Exception") || data.includes("Error")) {
        showToast("Lỗi khi xóa dữ liệu!", "error");
        console.log(data);
      } else {
        showToast("Đã xóa đối tượng khỏi Cơ sở dữ liệu thành công!");
        AppGIS.map.closePopup();
        layerObj.setParams({ fake: Date.now() }, false);
      }
    })
    .catch((e) => {
      showToast("❌ Delete thất bại: " + e.message);
      console.error(e);
    });
}

// =====================================================================
// PHẦN DRAW VÀ LƯU DỮ LIỆU (TẠO MỚI TÀI NGUYÊN)
// =====================================================================

const btnThemTaiNguyen = document.getElementById("btnThemTaiNguyen");
const danhSachTaiNguyen = document.getElementById("danhSachTaiNguyen");

var taiNguyenDangChon = "";
const cacLoaiTaiNguyen = document.querySelectorAll(".resource-item");
const menuTaiNguyen = document.getElementById("danhSachTaiNguyen");

cacLoaiTaiNguyen.forEach(function (item) {
  item.addEventListener("click", function () {
    const loaiHinh = this.getAttribute("data-loai");
    taiNguyenDangChon = this.getAttribute("data-ten");
    menuTaiNguyen.classList.add("hidden");

    if (loaiHinh === "polygon") {
      new L.Draw.Polygon(AppGIS.map).enable();
    } else if (loaiHinh === "polyline") {
      new L.Draw.Polyline(AppGIS.map).enable();
    } else if (loaiHinh === "point") {
      new L.Draw.Marker(AppGIS.map).enable();
    }
    showToast(
      "Chọn vị trí trên bản đồ để vẽ/chấm điểm cho: " + taiNguyenDangChon,
    );
  });
});

var drawnItems = new L.FeatureGroup();
AppGIS.map.addLayer(drawnItems);
// =====================================================================
// ĐO ĐẠC (MEASURE)
// =====================================================================
let cheDoVe = "resource"; // "resource" | "measure"
let kieuDoDat = "distance"; // "distance" | "area"

var measureItems = new L.FeatureGroup();
AppGIS.map.addLayer(measureItems);

function tinhDoDaiPolyline(latlngs) {
  let sum = 0;
  for (let i = 1; i < latlngs.length; i++) {
    // Đổi 'map' thành 'AppGIS.map'
    sum += AppGIS.map.distance(latlngs[i - 1], latlngs[i]);
  }
  return sum;
}
function dinhDangDoDai(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + " km";
  return m.toFixed(2) + " m";
}
function geodesicArea(latlngs) {
  // công thức chuẩn Leaflet (m2)
  const d2r = Math.PI / 180;
  let area = 0.0;
  const n = latlngs.length;
  if (n < 3) return 0;

  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];
    area +=
      (p2.lng - p1.lng) *
      d2r *
      (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  area = (area * 6378137.0 * 6378137.0) / 2.0;
  return Math.abs(area);
}
function dinhDangDienTich(m2) {
  const ha = m2 / 10000;
  if (ha >= 1)
    return `${ha.toFixed(2)} ha (${Math.round(m2).toLocaleString("vi-VN")} m²)`;
  return `${Math.round(m2).toLocaleString("vi-VN")} m²`;
}

AppGIS.map.on("draw:created", function (e) {
  var type = e.layerType;
  var layer = e.layer;

  // ✅ Nếu đang ở chế độ đo đạc -> xử lý đo và THOÁT luôn (không chạy thêm tài nguyên)
  if (cheDoVe === "measure") {
    measureItems.addLayer(layer);

    let html = `<h4 class="measure-title">Kết quả đo</h4>`;

    if (type === "polyline") {
      const latlngs = layer.getLatLngs();
      const m = tinhDoDaiPolyline(latlngs);
      html += `<p><b>Độ dài:</b> ${dinhDangDoDai(m)}</p>`;
    } else if (type === "polygon") {
      const rings = layer.getLatLngs();
      const latlngs = Array.isArray(rings[0]) ? rings[0] : rings;
      const m2 = geodesicArea(latlngs);
      html += `<p><b>Diện tích:</b> ${dinhDangDienTich(m2)}</p>`;
    }

    html += `<div class="popup-actions">
            <button class="btn-popup btn-delete">🧹 XÓA ĐO</button>
          </div>`;

    const box = document.createElement("div");
    box.className = "info-popup";
    box.innerHTML = html;

    box.querySelector(".btn-delete")?.addEventListener("click", (ev) => {
      L.DomEvent.stop(ev);
      measureItems.removeLayer(layer);
      AppGIS.map.closePopup();
    });

    layer.bindPopup(box).openPopup();
    return;
  }

  // ✅ Còn lại là chế độ thêm tài nguyên như cũ
  drawnItems.addLayer(layer);

  // 1. NHÁNH VẼ ĐIỂM (MỎ KHOÁNG SẢN HOẶC SINH VẬT)
  if (type === "marker") {
    var toaDo = layer.getLatLng();

    if (taiNguyenDangChon === "Mỏ khoáng sản") {
      var formDiv = document.createElement("div");
      formDiv.className = "wfs-form-container";
      formDiv.innerHTML = `
        <h4 class="wfs-form-header">THÊM MỎ KHOÁNG SẢN</h4>
        <div class="wfs-form-group"><label>Tên đơn vị:</label><input type="text" id="inpTen" class="wfs-input" placeholder="Nhập tên mỏ..."></div>
        <div class="wfs-form-group"><label>Loại khoáng sản:</label>
          <select id="inpLoai" class="wfs-input">
            <option value="Chưa phân loại">Chưa phân loại</option><option value="Đá xây dựng">Đá xây dựng</option>
            <option value="Sét gạch ngói">Sét gạch ngói</option><option value="Cát xây dựng">Cát xây dựng</option>
            <option value="Cát san lấp">Cát san lấp</option><option value="Đất đá san lấp">Đất đá san lấp</option>
            <option value="Đá vôi">Đá vôi</option><option value="Than bùn">Than bùn</option>
          </select>
        </div>
        <div class="wfs-form-group"><label>Tình trạng:</label>
          <select id="inpTinhTrang" class="wfs-input">
            <option value="Chưa xác định">Chưa xác định</option><option value="Đã quy hoạch">Đã quy hoạch</option>
            <option value="Chưa khai thác">Chưa khai thác</option><option value="Đang khai thác" selected>Đang khai thác</option>
            <option value="Tạm dừng khai thác">Tạm dừng khai thác</option><option value="Đóng cửa mỏ">Đóng cửa mỏ</option>
            <option value="Khu vực cấm khai thác">Khu vực cấm khai thác</option><option value="Khai thác trái phép">Khai thác trái phép</option>
          </select>
        </div>
        <div class="wfs-flex-row">
          <div class="wfs-flex-col"><label>Trữ lượng:</label><input type="number" id="inpTruLuong" class="wfs-input" value="0"></div>
          <div class="wfs-flex-col"><label>Diện tích (ha):</label><input type="number" id="inpDienTich" class="wfs-input" value="0"></div>
        </div>
        <div class="wfs-form-group"><label>Địa chỉ:</label><input type="text" id="inpDiaChi" class="wfs-input" placeholder="Nhập địa chỉ..."></div>
        <div class="wfs-form-group"><label>Đối tượng bảo vệ:</label><input type="text" id="inpDoiTuong" class="wfs-input" placeholder="Nhập đối tượng bảo vệ..."></div>
        <div class="wfs-button-group">
          <button id="btnHuyForm" class="wfs-btn wfs-btn-cancel">❌ HỦY</button>
          <button id="btnLuuForm" class="wfs-btn wfs-btn-save">💾 LƯU</button>
        </div>
      `;

      layer.bindPopup(formDiv).openPopup();

      formDiv
        .querySelector("#btnHuyForm")
        .addEventListener("click", function () {
          AppGIS.map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDiv
        .querySelector("#btnLuuForm")
        .addEventListener("click", function () {
          var ten = formDiv.querySelector("#inpTen").value;
          var loai = formDiv.querySelector("#inpLoai").value;
          var tinhTrang = formDiv.querySelector("#inpTinhTrang").value;
          var truLuong = formDiv.querySelector("#inpTruLuong").value;
          var dienTich = formDiv.querySelector("#inpDienTich").value;
          var diaChi = formDiv.querySelector("#inpDiaChi").value;
          var doiTuong = formDiv.querySelector("#inpDoiTuong").value;

          if (!ten) {
            showToast("Kiếp nạn! Không được để trống Tên đơn vị!");
            return;
          }

          insertFeatureToGeoServer("khoangsan_diem_mo", "Point", toaDo, {
            ten_don_vi: ten,
            loai_khoang_san: loai,
            tinh_trang: tinhTrang,
            tru_luong: truLuong,
            dien_tich: dienTich,
            dia_chi: diaChi,
            doi_tuong_bao_ve: doiTuong,
            nguon_du_lieu: "WebGIS An Giang",
          });
          AppGIS.map.closePopup();
        });
    } else if (
      taiNguyenDangChon === "Tài nguyên Động vật" ||
      taiNguyenDangChon === "Tài nguyên Thực vật"
    ) {
      var isDongVat = taiNguyenDangChon === "Tài nguyên Động vật";
      var tieuDe = isDongVat ? "THÊM ĐỘNG VẬT" : "THÊM THỰC VẬT";
      var mauNen = isDongVat ? "#e65100" : "#33691e";
      var tenBangDB = isDongVat ? "dongvat" : "thucvat";

      var formDivSinhVat = document.createElement("div");
      formDivSinhVat.className = "wfs-form-container";
      formDivSinhVat.innerHTML = `
        <h4 class="wfs-form-header" style="color: ${mauNen}; border-color: ${mauNen};">${tieuDe}</h4>
        <div class="wfs-form-group"><label>Tên sinh vật:</label><input type="text" id="inpTenSV" class="wfs-input" placeholder="Nhập tên..."></div>
        <div class="wfs-form-group"><label>Phân loại:</label><input type="text" id="inpPhanLoai" class="wfs-input" placeholder="VD: Lưỡng cư, Bò sát, Cây gỗ..."></div>
        <div class="wfs-form-group"><label>Nhóm:</label><input type="text" id="inpNhom" class="wfs-input" placeholder="VD: Nhóm IB, IIB..."></div>
        <div class="wfs-form-group"><label>Vị trí phân bố:</label><input type="text" id="inpViTri" class="wfs-input" placeholder="Nhập vị trí..."></div>
        <div class="wfs-form-group"><label>Mức độ nguy cấp:</label>
          <select id="inpNguyCap" class="wfs-input">
  <option value="Ít quan tâm (LC)" selected>Ít quan tâm (LC)</option>
  <option value="Sắp nguy cấp (VU)">Sắp nguy cấp (VU)</option>
  <option value="Nguy cấp (EN)">Nguy cấp (EN)</option>
  <option value="Cực kỳ nguy cấp (CR)">Cực kỳ nguy cấp (CR)</option>
</select>
        </div>
        <div class="wfs-button-group">
          <button id="btnHuySV" class="wfs-btn wfs-btn-cancel">❌ HỦY</button>
          <button id="btnLuuSV" class="wfs-btn wfs-btn-save" style="background-color: ${mauNen};">💾 LƯU</button>
        </div>
      `;

      layer.bindPopup(formDivSinhVat).openPopup();

      formDivSinhVat
        .querySelector("#btnHuySV")
        .addEventListener("click", function () {
          AppGIS.map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDivSinhVat
        .querySelector("#btnLuuSV")
        .addEventListener("click", function () {
          var ten = formDivSinhVat.querySelector("#inpTenSV").value.trim();
          var phanLoai =
            formDivSinhVat.querySelector("#inpPhanLoai").value.trim() ||
            "Chưa xác định";
          var nhom =
            formDivSinhVat.querySelector("#inpNhom").value.trim() ||
            "Chưa xác định";
          var viTri =
            formDivSinhVat.querySelector("#inpViTri").value.trim() ||
            "Chưa xác định";
          var nguyCap = formDivSinhVat.querySelector("#inpNguyCap").value;

          if (!ten) {
            showToast("Kiếp nạn! Tên sinh vật không được để trống!");
            return;
          }

          insertFeatureToGeoServer(tenBangDB, "Point", toaDo, {
            ten_loai: ten,
            phan_loai: phanLoai,
            nhom: nhom,
            vi_tri_phan_bo: viTri,
            muc_do_nguy_cap: nguyCap,
          });

          AppGIS.map.closePopup();
        });
    }
  } else if (type === "polygon") {
    if (taiNguyenDangChon === "Tài nguyên Rừng") {
      var latlngs = layer.getLatLngs()[0];
      var chuoiToaDo = "";
      for (var i = 0; i < latlngs.length; i++) {
        chuoiToaDo += latlngs[i].lng + "," + latlngs[i].lat + " ";
      }
      chuoiToaDo += latlngs[0].lng + "," + latlngs[0].lat;

      var formDivRung = document.createElement("div");
      formDivRung.className = "wfs-form-container";
      formDivRung.innerHTML = `<h4 class="wfs-form-header rung">THÊM TÀI NGUYÊN RỪNG</h4>
        <div class="wfs-form-group"><label>Tên rừng:</label><input type="text" id="inpTenRung" class="wfs-input" placeholder="Nhập tên rừng..."></div>
        <div class="wfs-form-group"><input type="hidden" id="inpNhomRung" class="wfs-input" value="rừng">
        <div class="wfs-form-group"><label>Loại rừng:</label>
          <select id="inpLoaiRung" class="wfs-input">
            <option value="Rừng phòng hộ">Rừng phòng hộ</option><option value="Rừng đặc dụng">Rừng đặc dụng</option>
            <option value="Rừng sản xuất">Rừng sản xuất</option>
          </select>
        </div>
        <div class="wfs-form-group"><label>Tình trạng:</label>
          <select id="inpTinhTrangRung" class="wfs-input">
            <option value="Chưa xác định">Chưa xác định</option><option value="Ổn định - Bảo vệ">Ổn định - Bảo vệ</option>
<option value="Cảnh báo cháy">Cảnh báo cháy</option><option value="Đang cháy" selected>Đang cháy</option>
            <option value="Bị suy thoái">Bị suy thoái</option><option value="Đang tái sinh">Đang tái sinh</option>
          </select>
        </div>
        <div class="wfs-form-group"><label>Diện tích (ha):</label><input type="number" id="inpDienTichRung" class="wfs-input" value="0"></div>
        <div class="wfs-button-group">
          <button id="btnHuyRung" class="wfs-btn wfs-btn-cancel">❌ HỦY</button>
          <button id="btnLuuRung" class="wfs-btn wfs-btn-save bg-rung">💾 LƯU RỪNG</button>
        </div>
      `;

      layer.bindPopup(formDivRung).openPopup();

      formDivRung
        .querySelector("#btnHuyRung")
        .addEventListener("click", function () {
          AppGIS.map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDivRung
        .querySelector("#btnLuuRung")
        .addEventListener("click", function () {
          var ten = formDivRung.querySelector("#inpTenRung").value.trim();
          var nhom = formDivRung.querySelector("#inpNhomRung").value.trim();
          var loai = formDivRung.querySelector("#inpLoaiRung").value;
          var tinhTrang = formDivRung.querySelector("#inpTinhTrangRung").value;
          var dienTich = formDivRung.querySelector("#inpDienTichRung").value;

          if (!ten) {
            showToast("Kiếp nạn! Tên rừng không được để trống!");
            return;
          }
          if (!nhom) nhom = "Chưa xác định";
          if (!dienTich || dienTich === "") dienTich = 0;

          insertFeatureToGeoServer("rung", "Polygon", chuoiToaDo, {
            ten: ten,
            nhom: nhom,
            loai_rung: loai,
            tinh_trang: tinhTrang,
            dien_tich_ha: dienTich,
            nguon_du_lieu: "WebGIS An Giang",
          });
          AppGIS.map.closePopup();
        });
    } else if (taiNguyenDangChon === "Tài nguyên Đất") {
      var latlngs = layer.getLatLngs()[0];
      var chuoiToaDo = "";
      for (var i = 0; i < latlngs.length; i++) {
        chuoiToaDo += latlngs[i].lng + "," + latlngs[i].lat + " ";
      }
      chuoiToaDo += latlngs[0].lng + "," + latlngs[0].lat;

      var formDivDat = document.createElement("div");
      formDivDat.className = "wfs-form-container";
      formDivDat.innerHTML = `
         <h4 class="wfs-form-header text-dat">THÊM TÀI NGUYÊN ĐẤT</h4>
        <div class="wfs-form-group"><label>Tên đất / Chủ sử dụng:</label><input type="text" id="TenDat" class="wfs-input" placeholder="Nhập tên đất..."></div>
        <div class="wfs-form-group"><label>Loại đất sử dụng:</label>
          <select id="loadatsudung" class="wfs-input">
            <option value="Đất chuyên trồng lúa nước">Đất chuyên trồng lúa nước</option>
            <option value="Đất trồng lúa nương">Đất trồng lúa nương</option>
            <option value="Đất trồng cây hàng năm khác">Đất trồng cây hàng năm khác</option>
            <option value="Đất trồng cây lâu năm">Đất trồng cây lâu năm</option>
            <option value="Đất rừng sản xuất">Đất rừng sản xuất</option>
            <option value="Đất nuôi trồng thủy sản">Đất nuôi trồng thủy sản</option>
            <option value="Đất ở tại đô thị">Đất ở tại đô thị</option>
            <option value="Đất ở tại nông thôn">Đất ở tại nông thôn</option>
          </select>
        </div>
        <div class="wfs-form-group"><label>Nhóm sử dụng:</label>
          <select id="nhomsudung" class="wfs-input">
            <option value="Đất nông nghiệp" selected>Đất nông nghiệp</option>
            <option value="Đất phi nông nghiệp">Đất phi nông nghiệp</option>
            <option value="Đất chưa sử dụng">Đất chưa sử dụng</option>
          </select>
        </div>
        <div class="wfs-flex-row">
            <div class="wfs-flex-col"><label>Diện tích (ha):</label><input type="number" id="inpDienTichHa" class="wfs-input" value="0"></div>
            <div class="wfs-flex-col"><label>Diện tích (m2):</label><input type="number" id="inpDienTichM2" class="wfs-input" value="0"></div>
        </div>
        <div class="wfs-button-group">
          <button id="btnHuyDat" class="wfs-btn wfs-btn-cancel">❌ HỦY</button>
          <button id="btnLuuDat" class="wfs-btn wfs-btn-save bg-dat">💾 LƯU ĐẤT</button>
        </div>
      `;

      layer.bindPopup(formDivDat).openPopup();

      formDivDat
        .querySelector("#btnHuyDat")
        .addEventListener("click", function () {
          AppGIS.map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDivDat
        .querySelector("#btnLuuDat")
        .addEventListener("click", function () {
          var ten = formDivDat.querySelector("#TenDat").value;
          var loai = formDivDat.querySelector("#loadatsudung").value;
          var nhomsudung = formDivDat.querySelector("#nhomsudung").value;
          var dienTichHa = formDivDat.querySelector("#inpDienTichHa").value;
          var dienTichM2 = formDivDat.querySelector("#inpDienTichM2").value;

          if (!ten) {
            showToast("Kiếp nạn! Tên đất không được để trống!");
            return;
          }

          insertFeatureToGeoServer("dat", "Polygon", chuoiToaDo, {
            ten: ten,
            loai_dat_su_dung: loai,
            nhom_su_dung: nhomsudung,
            dien_tich_ha: dienTichHa,
            dien_tich_m2: dienTichM2,
            nguon_du_lieu: "WebGIS An Giang",
          });
          AppGIS.map.closePopup();
        });
    }
  } else if (type === "polyline") {
    if (taiNguyenDangChon === "Tài nguyên Nước") {
      var latlngs = layer.getLatLngs();
      var chuoiToaDo = "";
      for (var i = 0; i < latlngs.length; i++) {
        chuoiToaDo += latlngs[i].lng + "," + latlngs[i].lat + " ";
      }
      chuoiToaDo = chuoiToaDo.trim();

      var formDivNuoc = document.createElement("div");
      formDivNuoc.className = "wfs-form-container";
      formDivNuoc.innerHTML = `
         <h4 class="wfs-form-header text-nuoc">THÊM TÀI NGUYÊN NƯỚC</h4>
        <div class="wfs-form-group"><label>Tên sông/kênh:</label><input type="text" id="inpTenNuoc" class="wfs-input" placeholder="Nhập tên..."></div>
        <div class="wfs-form-group"><label>Loại:</label>
          <select id="inpLoaiNuoc" class="wfs-input">
            <option value="kênh">kênh</option>
            <option value="rạch">rạch</option>
            <option value="sông">sông</option>
          </select>
        </div>
        <div class="wfs-form-group"><label>Cấp:</label>
          <select id="inpCapNuoc" class="wfs-input">
            <option value="chính">chính</option>
            <option value="nhánh">nhánh</option>
          </select>
        </div>
        <div class="wfs-button-group">
          <button id="btnHuyNuoc" class="wfs-btn wfs-btn-cancel">❌ HỦY</button>
          <button id="btnLuuNuoc" class="wfs-btn wfs-btn-save bg-nuoc">💾 LƯU NƯỚC</button>
        </div>
      `;

      layer.bindPopup(formDivNuoc).openPopup();

      formDivNuoc
        .querySelector("#btnHuyNuoc")
        .addEventListener("click", function () {
          AppGIS.map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDivNuoc
        .querySelector("#btnLuuNuoc")
        .addEventListener("click", function () {
          var ten = formDivNuoc.querySelector("#inpTenNuoc").value.trim();
          var loai = formDivNuoc.querySelector("#inpLoaiNuoc").value;
          var cap = formDivNuoc.querySelector("#inpCapNuoc").value;

          if (!ten) {
            showToast("Kiếp nạn! Tên sông/kênh không được để trống!");
            return;
          }

          insertFeatureToGeoServer("waterways", "LineString", chuoiToaDo, {
            ten: ten,
            loai: loai,
            cap: cap,
            nguon: "WebGIS An Giang",
          });
          AppGIS.map.closePopup();
        });
    }
  }
});

function insertFeatureToGeoServer(layerName, geometryType, coords, props) {
  const WORKSPACE = "angiang";
  const WORKSPACE_URI = "http://angiang.vn";
  const nsPrefix = WORKSPACE;

  // 1. Tạo XML cho phần Hình học (Geometry)
  let geomXml = "";
  if (geometryType === "Point") {
    geomXml = `
          <${nsPrefix}:geom>
            <gml:Point srsName="EPSG:4326">
              <gml:coordinates>${coords.lng},${coords.lat}</gml:coordinates>
           </gml:Point>
        </${nsPrefix}:geom>`;
  } else if (geometryType === "LineString") {
    geomXml = `
        <${nsPrefix}:geom>
          <gml:MultiLineString srsName="EPSG:4326">
            <gml:lineStringMember><gml:LineString>
              <gml:coordinates>${String(coords).trim()}</gml:coordinates>
                  </gml:LineString></gml:lineStringMember>
         </gml:MultiLineString>
        </${nsPrefix}:geom>`;
  } else if (geometryType === "Polygon") {
    geomXml = `
         <${nsPrefix}:geom>
         <gml:MultiPolygon srsName="EPSG:4326">
            <gml:polygonMember><gml:Polygon><gml:outerBoundaryIs><gml:LinearRing>
             <gml:coordinates>${String(coords).trim()}</gml:coordinates>
             </gml:LinearRing></gml:outerBoundaryIs></gml:Polygon></gml:polygonMember>
          </gml:MultiPolygon>
        </${nsPrefix}:geom>`;
  }

  // 2. Tạo XML cho phần Thuộc tính (Properties)
  let propsXml = "";
  for (const key in props) {
    if (props[key] !== undefined && props[key] !== null) {
      // Chỉ cho phép chữ, số và gạch dưới trong tên cột (Key)
      const safeKey = String(key).replace(/[^a-z0-9_]/gi, "");
      propsXml += `<${nsPrefix}:${safeKey}>${esc(props[key])}</${nsPrefix}:${safeKey}>`;
    }
  }

  // 3. Thêm các trường hệ thống (người tạo, ngày tạo, trạng thái)
  propsXml += wfInsertMetaXml(nsPrefix);

  // 4. Lắp ráp bản tin WFS Transaction đầy đủ
  const wfsTransaction = `
       <wfs:Transaction service="WFS" version="1.0.0"
         xmlns:wfs="http://www.opengis.net/wfs"
         xmlns:gml="http://www.opengis.net/gml"
         xmlns:${nsPrefix}="${WORKSPACE_URI}">
       <wfs:Insert>
         <${nsPrefix}:${layerName}>
           ${geomXml}
           ${propsXml}
            </${nsPrefix}:${layerName}>
        </wfs:Insert>
       </wfs:Transaction>`;

  console.log(`WFST INSERT [${layerName}] XML:`, wfsTransaction);

  // 5. Gửi lên máy chủ thông qua Proxy Backend
  postWFST("insert", `${nsPrefix}:${layerName}`, wfsTransaction)
    .then((data) => {
      console.log(`WFST INSERT [${layerName}] RESPONSE:`, data);
      if (wfstHasError(data)) {
        showToast(
          `❌ Lỗi từ GeoServer khi lưu lớp ${layerName}. Mở F12 để xem.`,
        );
        return;
      }
      if (wfstTotalInserted(data) === 0) {
        showToast("❌ Không có dữ liệu nào được lưu (totalInserted=0).");
        return;
      }
      showToast(`✅ Đã lưu dữ liệu vào lớp ${layerName} thành công!`);
      if (window.drawnItems) drawnItems.clearLayers();
    })
    .catch((e) => {
      showToast("❌ Lỗi kết nối hoặc phân quyền: " + e.message);
      console.error(e);
    });
}
