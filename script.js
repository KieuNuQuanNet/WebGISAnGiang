// =====================================================================
// PHẦN 1: KHAI BÁO CÁC LỚP BẢN ĐỒ NỀN (BASEMAPS)
// =====================================================================

var osmLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
);

var googleSatLayer = L.tileLayer(
  "http://mt0.google.com/vt/lyrs=s&hl=vi&x={x}&y={y}&z={z}",
  { maxZoom: 20, attribution: "&copy; Google Maps" },
);

// =====================================================================
// PHẦN 2: KHAI BÁO LỚP DỮ LIỆU WMS TỪ MÁY CHỦ VPS
// =====================================================================

var urlWMS = "/myproxy/angiang/wms";

// ✅ CHỈ HIỂN THỊ DỮ LIỆU ĐÃ CÔNG BỐ
const CQL_CONG_BO = "trang_thai_du_lieu='cong_bo'";

var rung = L.tileLayer.wms(urlWMS, {
  layers: "angiang:rung",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

var nuoc = L.tileLayer.wms(urlWMS, {
  layers: "angiang:waterways",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

var dat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:dat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

var khoangsan = L.tileLayer.wms(urlWMS, {
  layers: "angiang:khoangsan_diem_mo",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

var dongvat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:dongvat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

var thucvat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:thucvat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

// =====================================================================
// PHẦN 3: KHỞI TẠO BẢN ĐỒ VÀ THIẾT LẬP GÓC NHÌN
// =====================================================================

var map = L.map("map", {
  center: [10.3711, 105.4328],
  zoom: 11,
  layers: [osmLayer],
});

var marker = L.marker([10.3711, 105.4328]).addTo(map);
marker
  .bindPopup(
    "<b>Chào mừng đến với WebGIS An Giang!</b><br>Đây là trung tâm TP. Long Xuyên.",
  )
  .openPopup();

var CustomLayerControl = L.Control.extend({
  options: { position: "topright" },

  onAdd: function (map) {
    var container = L.DomUtil.create(
      "div",
      "leaflet-control-layers leaflet-control",
    );
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // Đã thêm thanh cuộn (max-height) để danh sách siêu dài không bị tràn màn hình
    container.innerHTML = `
      <a class="leaflet-control-layers-toggle" href="#" title="Layers"></a>
      <form class="leaflet-control-layers-list" style="max-height: 70vh; overflow-y: auto; overflow-x: hidden; padding-right: 5px;">
        
        <!-- NỀN BẢN ĐỒ -->
        <div class="leaflet-control-layers-base">
          <div class="lop-ban-do"><label><input type="radio" name="basemap" value="osm" checked> <span> Bản đồ Đường phố (OSM)</span></label></div>
          <div class="lop-ban-do"><label><input type="radio" name="basemap" value="google"> <span> Bản đồ Vệ tinh (Google)</span></label></div>
        </div>

        <div class="leaflet-control-layers-separator" style="margin: 8px 0; border-top: 1px solid #ddd;"></div>

        <!-- CÁC LỚP GEOSERVER -->
        <div class="leaflet-control-layers-overlays">
          
          <!-- LỚP RỪNG -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkRung"> <span> Tài nguyên Rừng</span></label>
              <span class="toggle-arrow" id="arrRung" onclick="toggleBoLoc('filRung', 'arrRung')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filRung">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-rung" value="Rừng phòng hộ"> Rừng phòng hộ</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-rung" value="Rừng đặc dụng"> Rừng đặc dụng</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-rung" value="Rừng sản xuất"> Rừng sản xuất</label></div>
            </div>
          </div>

          <!-- LỚP ĐẤT (Cập nhật 8 loại theo Form Thêm) -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkDat"> <span> Tài nguyên Đất</span></label>
              <span class="toggle-arrow" id="arrDat" onclick="toggleBoLoc('filDat', 'arrDat')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filDat">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất chuyên trồng lúa nước"> Đất trồng lúa nước</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất trồng lúa nương"> Đất trồng lúa nương</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất trồng cây hàng năm khác"> Đất cây hàng năm khác</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất trồng cây lâu năm"> Đất trồng cây lâu năm</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất rừng sản xuất"> Đất rừng sản xuất</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất nuôi trồng thủy sản"> Đất nuôi trồng thủy sản</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất ở tại đô thị"> Đất ở tại đô thị</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dat" value="Đất ở tại nông thôn"> Đất ở tại nông thôn</label></div>
            </div>
          </div>

          <!-- LỚP NƯỚC (Cập nhật Sông/Kênh/Rạch) -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkNuoc"> <span> Tài nguyên Nước</span></label>
              <span class="toggle-arrow" id="arrNuoc" onclick="toggleBoLoc('filNuoc', 'arrNuoc')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filNuoc">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-nuoc" value="sông"> Sông</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-nuoc" value="kênh"> Kênh</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-nuoc" value="rạch"> Rạch</label></div>
            </div>
          </div>

          <!-- LỚP KHOÁNG SẢN (Cập nhật 8 loại) -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkKhoangSan"> <span> Mỏ Khoáng Sản</span></label>
              <span class="toggle-arrow" id="arrKhoangSan" onclick="toggleBoLoc('filKhoangSan', 'arrKhoangSan')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filKhoangSan">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Đá xây dựng"> Đá xây dựng</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Sét gạch ngói"> Sét gạch ngói</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Cát xây dựng"> Cát xây dựng</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Cát san lấp"> Cát san lấp</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Đất đá san lấp"> Đất đá san lấp</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Đá vôi"> Đá vôi</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Than bùn"> Than bùn</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-khoangsan" value="Chưa phân loại"> Chưa phân loại</label></div>
            </div>
          </div>

          <!-- LỚP ĐỘNG VẬT -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkDongVat"> <span> Động vật hoang dã</span></label>
              <span class="toggle-arrow" id="arrDongVat" onclick="toggleBoLoc('filDongVat', 'arrDongVat')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filDongVat">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dongvat" value="Bình thường"> Bình thường</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dongvat" value="Ít quan tâm (LC)"> Ít quan tâm (LC)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dongvat" value="Sắp nguy cấp (VU)"> Sắp nguy cấp (VU)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dongvat" value="Nguy cấp (EN)"> Nguy cấp (EN)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-dongvat" value="Cực kỳ nguy cấp (CR)"> Cực kỳ nguy cấp (CR)</label></div>
            </div>
          </div>

          <!-- LỚP THỰC VẬT -->
          <div class="lop-ban-do">
            <div class="layer-main-row">
              <label><input type="checkbox" id="chkThucVat"> <span> Thực vật quý hiếm</span></label>
              <span class="toggle-arrow" id="arrThucVat" onclick="toggleBoLoc('filThucVat', 'arrThucVat')">V</span>
            </div>
            <div class="layer-filter-row hidden" id="filThucVat">
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-thucvat" value="Bình thường"> Bình thường</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-thucvat" value="Ít quan tâm (LC)"> Ít quan tâm (LC)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-thucvat" value="Sắp nguy cấp (VU)"> Sắp nguy cấp (VU)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-thucvat" value="Nguy cấp (EN)"> Nguy cấp (EN)</label></div>
              <div class="lop-thuoc-tinh"><label><input type="checkbox" class="sub-thucvat" value="Cực kỳ nguy cấp (CR)"> Cực kỳ nguy cấp (CR)</label></div>
            </div>
          </div>

        </div>
      </form>
    `;

    container.addEventListener("mouseenter", function () {
      container.classList.add("leaflet-control-layers-expanded");
    });
    container.addEventListener("mouseleave", function () {
      container.classList.remove("leaflet-control-layers-expanded");
    });

    return container;
  },
});

map.addControl(new CustomLayerControl());

// ------------------------------------------
// HÀM LOGIC CHO BẢNG LAYER
// ------------------------------------------

document.querySelectorAll('input[name="basemap"]').forEach((radio) => {
  radio.addEventListener("change", function () {
    if (this.value === "osm") {
      map.addLayer(osmLayer);
      map.removeLayer(googleSatLayer);
    } else {
      map.addLayer(googleSatLayer);
      map.removeLayer(osmLayer);
    }
  });
});

window.toggleBoLoc = function (boxId, arrowId) {
  document.getElementById(boxId).classList.toggle("hidden");
  document.getElementById(arrowId).classList.toggle("open");
};

// ⚙️ Chỉ hiển thị dữ liệu đã Công bố trên bản đồ
// 👉 Nếu muốn debug hiển thị TẤT CẢ dữ liệu, đổi thành "" (chuỗi rỗng)
const BASE_CQL_PUBLISHED = "trang_thai_du_lieu='cong_bo'";

function capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName) {
  const chkMain = document.getElementById(chkMainId);
  if (!chkMain || !chkMain.checked) {
    map.removeLayer(layerWMS);
    return;
  }

  if (!map.hasLayer(layerWMS)) map.addLayer(layerWMS);

  const cacOTick = document.querySelectorAll("." + subClassName + ":checked");
  const tongSoOPhu = document.querySelectorAll("." + subClassName).length;

  // ✅ Nếu lớp KHÔNG có checkbox con => vẫn hiển thị bình thường
  if (tongSoOPhu === 0) {
    if (BASE_CQL_PUBLISHED)
      layerWMS.setParams({ CQL_FILTER: BASE_CQL_PUBLISHED });
    else {
      delete layerWMS.wmsParams.CQL_FILTER;
      layerWMS.redraw();
    }
    return;
  }

  // ✅ All hoặc none (trong trường hợp DOM chưa sync) => chỉ áp BASE_CQL
  if (cacOTick.length === 0 || cacOTick.length === tongSoOPhu) {
    if (BASE_CQL_PUBLISHED)
      layerWMS.setParams({ CQL_FILTER: BASE_CQL_PUBLISHED });
    else {
      delete layerWMS.wmsParams.CQL_FILTER;
      layerWMS.redraw();
    }
    return;
  }

  // ✅ Lọc theo checkbox con + AND với BASE_CQL
  const subOr = Array.from(cacOTick)
    .map((chk) => `${columnName} = '${chk.value}'`)
    .join(" OR ");

  const cqlString = BASE_CQL_PUBLISHED
    ? `(${BASE_CQL_PUBLISHED}) AND (${subOr})`
    : subOr;
  layerWMS.setParams({ CQL_FILTER: cqlString });
}

function dongBoCheckbox(chkMainId, subClassName, layerWMS, columnName) {
  var chkMain = document.getElementById(chkMainId);
  var subChks = document.querySelectorAll("." + subClassName);

  chkMain.addEventListener("change", function () {
    var isChecked = this.checked;
    subChks.forEach((chk) => (chk.checked = isChecked));
    capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
  });

  subChks.forEach((chk) => {
    chk.addEventListener("change", function () {
      var anyChecked = document.querySelector("." + subClassName + ":checked");
      chkMain.checked = !!anyChecked;
      capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
    });
  });
}

function kichHoat(chkMainId, subClassName, layerWMS, columnName) {
  dongBoCheckbox(chkMainId, subClassName, layerWMS, columnName);
  capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
}

// 🌟 ĐÃ CẬP NHẬT TÊN CỘT DATABASE CHO KHỚP VỚI DANH SÁCH MỚI
kichHoat("chkRung", "sub-rung", rung, "loai_rung");
kichHoat("chkDat", "sub-dat", dat, "loai_dat_su_dung"); // Đổi từ nhom_su_dung sang loai_dat_su_dung
kichHoat("chkNuoc", "sub-nuoc", nuoc, "loai"); // Đổi từ cap sang loai
kichHoat("chkKhoangSan", "sub-khoangsan", khoangsan, "loai_khoang_san"); // Đổi từ tinh_trang sang loai_khoang_san
kichHoat("chkDongVat", "sub-dongvat", dongvat, "muc_do_nguy_cap");
kichHoat("chkThucVat", "sub-thucvat", thucvat, "muc_do_nguy_cap");
// =====================================================================
// 🌟 TUYỆT KỸ MỚI: TỪ ĐIỂN DỊCH TÊN CỘT DATABASE SANG TIẾNG VIỆT
// =====================================================================
const TU_DIEN_COT = {
  ten: "Tên tài nguyên",
  ten_don_vi: "Tên mỏ / Đơn vị",
  ten_loai: "Tên loài sinh vật",
  nhom: "Nhóm",
  loai: "Loại",
  loai_rung: "Loại rừng",
  loai_khoang_san: "Loại khoáng sản",
  loai_dat_su_dung: "Loại đất",
  nhom_su_dung: "Nhóm sử dụng",
  tinh_trang: "Tình trạng",
  dien_tich: "Diện tích",
  dien_tich_ha: "Diện tích (Hecta)",
  dien_tich_m2: "Diện tích (m2)",
  tru_luong: "Trữ lượng",
  dia_chi: "Địa chỉ",
  doi_tuong_bao_ve: "Đối tượng bảo vệ",
  cap: "Cấp",
  phan_loai: "Phân loại",
  vi_tri_phan_bo: "Vị trí phân bố",
  muc_do_nguy_cap: "Mức độ nguy cấp",
  nguon_du_lieu: "Nguồn dữ liệu",
  nguon: "Nguồn tham khảo",
};
const WF_SYSTEM_FIELDS = new Set([
  "trang_thai_du_lieu",
  "ngay_tao",
  "nguoi_tao",
  "ngay_cap_nhat",
  "nguoi_cap_nhat",
  "ngay_phe_duyet",
  "nguoi_phe_duyet",
  "ngay_cong_bo",
  "nguoi_cong_bo",
  "ly_do_tu_choi",
]);
// =====================================================================
// 🌟 ĐỒNG BỘ POPUP (TÌM KIẾM / TRUY VẤN / CLICK LỚP)
// =====================================================================
const LAYER_META = {
  "angiang:khoangsan_diem_mo": {
    tieuDe: "Khoáng sản",
    layerObj: khoangsan,
    chkMainId: "chkKhoangSan",
    subClass: "sub-khoangsan",
    columnName: "loai_khoang_san",
  },
  "angiang:rung": {
    tieuDe: "Rừng",
    layerObj: rung,
    chkMainId: "chkRung",
    subClass: "sub-rung",
    columnName: "loai_rung",
  },
  "angiang:waterways": {
    tieuDe: "Nước",
    layerObj: nuoc,
    chkMainId: "chkNuoc",
    subClass: "sub-nuoc",
    columnName: "loai",
  },
  "angiang:dat": {
    tieuDe: "Đất",
    layerObj: dat,
    chkMainId: "chkDat",
    subClass: "sub-dat",
    columnName: "loai_dat_su_dung",
  },
  "angiang:dongvat": {
    tieuDe: "Động vật",
    layerObj: dongvat,
    chkMainId: "chkDongVat",
    subClass: "sub-dongvat",
    columnName: "muc_do_nguy_cap",
  },
  "angiang:thucvat": {
    tieuDe: "Thực vật",
    layerObj: thucvat,
    chkMainId: "chkThucVat",
    subClass: "sub-thucvat",
    columnName: "muc_do_nguy_cap",
  },
};

function getLayerMeta(typeName) {
  return LAYER_META[typeName] || null;
}

// ✅ Chọn kết quả tìm kiếm/truy vấn -> bật lớp WMS để đối tượng hiển thị đúng style lớp tài nguyên
function damBaoLopWmsDangBat(typeName) {
  const meta = getLayerMeta(typeName);
  if (!meta) return null;

  const chkMain = document.getElementById(meta.chkMainId);
  if (!chkMain) return meta;

  // Nếu lớp đang tắt -> bật + tick toàn bộ checkbox con để hiển thị đầy đủ
  if (!chkMain.checked) {
    chkMain.checked = true;
    document
      .querySelectorAll("." + meta.subClass)
      .forEach((c) => (c.checked = true));
  }

  capNhatLopWMS(meta.layerObj, meta.chkMainId, meta.subClass, meta.columnName);
  return meta;
}

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

  // ✅ Chỉ Admin/Cán bộ mới được Sửa/Xóa (khớp backend: admin.users, feature.insert/update/delete)
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

  // ✅ Chỉ render nút nếu có quyền
  if (canEdit || canDelete) {
    htmlInfo += `<div class="popup-actions">`;
    if (canEdit)
      htmlInfo += `<button class="btn-popup btn-edit">✏️ SỬA</button>`;
    if (canDelete)
      htmlInfo += `<button class="btn-popup btn-delete">🗑️ XÓA</button>`;
    htmlInfo += `</div>`;
  }

  block.innerHTML = htmlInfo;
  L.DomEvent.disableClickPropagation(block);
  L.DomEvent.disableScrollPropagation(block);

  // ✅ Gắn event theo quyền + chặn thêm lần nữa khi bấm
  if (canDelete) {
    block
      .querySelector(".btn-delete")
      ?.addEventListener("click", function (ev) {
        L.DomEvent.stop(ev);

        // re-check phòng trường hợp quyền đổi trong lúc đang mở popup
        if (
          !(
            hasPerm("admin.users") ||
            hasPerm("feature.delete") ||
            hasPerm("feature.insert")
          )
        ) {
          alert("🔒 Bạn không có quyền Xóa dữ liệu!");
          return;
        }

        if (
          confirm(
            "Bạn có chắc chắn muốn xóa đối tượng này khỏi cơ sở dữ liệu không?",
          )
        ) {
          this.innerHTML = "⏳ Đang xóa...";
          xoaDuLieuWFS(layerName, featureId, layerObj);
        }
      });
  }

  if (canEdit) {
    block.querySelector(".btn-edit")?.addEventListener("click", function (ev) {
      L.DomEvent.stop(ev);

      if (
        !(
          hasPerm("admin.users") ||
          hasPerm("feature.update") ||
          hasPerm("feature.insert")
        )
      ) {
        alert("🔒 Bạn không có quyền Sửa dữ liệu!");
        return;
      }

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
map.on("click", function (e) {
  // ✅ tolerance theo pixel để click ổn định theo mọi mức zoom
  const pxTol = 8;
  const p = map.latLngToContainerPoint(e.latlng);
  const p1 = L.point(p.x - pxTol, p.y - pxTol);
  const p2 = L.point(p.x + pxTol, p.y + pxTol);
  const ll1 = map.containerPointToLatLng(p1);
  const ll2 = map.containerPointToLatLng(p2);

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
  if (map.hasLayer(khoangsan))
    promises.push(fetch1("angiang:khoangsan_diem_mo", khoangsan, "Khoáng sản"));
  if (map.hasLayer(rung)) promises.push(fetch1("angiang:rung", rung, "Rừng"));
  if (map.hasLayer(nuoc))
    promises.push(fetch1("angiang:waterways", nuoc, "Nước"));
  if (map.hasLayer(dat)) promises.push(fetch1("angiang:dat", dat, "Đất"));
  if (map.hasLayer(dongvat))
    promises.push(fetch1("angiang:dongvat", dongvat, "Động vật"));
  if (map.hasLayer(thucvat))
    promises.push(fetch1("angiang:thucvat", thucvat, "Thực vật"));

  // 2) Xử lý kết quả + popup
  Promise.all(promises).then((results) => {
    const errors = results.filter((r) => r && r.__error);
    const validResults = results.filter((r) => r && !r.__error);

    // ✅ Nếu không có gì -> vẫn mở popup báo rõ
    // ✅ Nếu không có gì -> KHÔNG hiện thông báo (đỡ khó chịu)
    // (tuỳ chọn) đóng popup đang mở nếu bạn muốn click trống là ẩn popup luôn
    if (validResults.length === 0) {
      if (errors.length) console.warn("WFS errors:", errors); // chỉ log để debug
      map.closePopup(); // muốn giữ popup cũ thì xóa dòng này
      return;
    }

    // --- phần cũ của bạn giữ nguyên từ đây trở xuống ---
    // ✅ Chỉ hiển thị 1 đối tượng (ưu tiên theo thứ tự promises.push)
    const item = validResults[0];

    // ✅ Dùng 1 chuẩn popup duy nhất (đã có phân quyền Sửa/Xóa)
    const block = taoPopupThongTin(
      item.feature,
      item.tieuDe,
      item.layerName,
      item.layerObj,
    );

    L.popup().setLatLng(e.latlng).setContent(block).openOn(map);
    L.DomEvent.disableClickPropagation(block);
    L.DomEvent.disableScrollPropagation(block);

    let htmlInfo = `<h4>Thông tin ${item.tieuDe}</h4>`;
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

    htmlInfo += `
  <div class="popup-actions">
    <button class="btn-popup btn-edit">✏️ SỬA</button>
    <button class="btn-popup btn-delete">🗑️ XÓA</button>
  </div>
`;
    block.innerHTML = htmlInfo;

    block.querySelector(".btn-delete").addEventListener("click", function (ev) {
      L.DomEvent.stop(ev);
      if (
        confirm(
          "Bạn có chắc chắn muốn xóa đối tượng này khỏi cơ sở dữ liệu không?",
        )
      ) {
        this.innerHTML = "⏳ Đang xóa...";
        xoaDuLieuWFS(item.layerName, featureId, item.layerObj);
      }
    });

    block.querySelector(".btn-edit").addEventListener("click", function (ev) {
      L.DomEvent.stop(ev);
      moFormSuaDoi(block, item.layerName, featureId, props, item.layerObj);
    });

    L.popup().setLatLng(e.latlng).setContent(block).openOn(map);
  });
});

// =====================================================================
// HÀM 1: BIẾN POPUP THÀNH FORM SỬA CHỮA (CÓ DÙNG TỪ ĐIỂN)
// =====================================================================
function moFormSuaDoi(blockElement, layerName, featureId, props, layerObj) {
  var formHtml = `<div class='wfs-form-container'><h4 class="wfs-form-header" style="color:#2196F3; border-color:#2196F3;">CẬP NHẬT DỮ LIỆU</h4>`;

  // 👉 DÙNG TỪ ĐIỂN ĐỂ IN RA TÊN ĐẸP CHO FORM SỬA
  for (var key in props) {
    if (
      key !== "bbox" &&
      key !== "geom" &&
      key !== "id" &&
      !WF_SYSTEM_FIELDS.has(key)
    ) {
      var tenHienThi = TU_DIEN_COT[key] || key;
      formHtml += `
              <div class="wfs-form-group">
                <label>${tenHienThi}:</label>
                <!-- data-key giữ nguyên tên gốc để DB hiểu, value lấy dữ liệu hiện tại -->
                <input type='text' class='wfs-input edit-input' data-key='${key}' value='${props[key] || ""}'>
              </div>`;
    }
  }
  formHtml += `
        <div class="wfs-button-group">
            <button class='wfs-btn wfs-btn-cancel' id='btnHuySua' style="background-color:#9e9e9e;">HỦY</button> 
            <button class='wfs-btn wfs-btn-save' id='btnLuuSua' style="background-color:#2196F3;">💾 LƯU LẠI</button>
        </div>
    </div>`;

  blockElement.innerHTML = formHtml; // Biến hình giao diện!

  // Nút Hủy
  blockElement.querySelector("#btnHuySua").addEventListener("click", (e) => {
    L.DomEvent.stop(e);
    map.closePopup();
  });

  // Nút Lưu
  blockElement
    .querySelector("#btnLuuSua")
    .addEventListener("click", function (e) {
      L.DomEvent.stop(e);
      this.innerHTML = "⏳ Đang lưu...";
      var updatedProps = {};

      // Càn quét qua tất cả các ô Input để lấy chữ mới, dùng 'data-key' để đưa về tên cột Postgres gốc
      blockElement.querySelectorAll(".edit-input").forEach((input) => {
        const k = input.getAttribute("data-key");
        if (!k || WF_SYSTEM_FIELDS.has(k)) return;
        updatedProps[k] = input.value;
      });

      // ✅ Audit tự động khi sửa
      updatedProps["ngay_cap_nhat"] = nowIsoNoTZ();
      const uid = getUserIdFromToken();
      if (uid !== null) updatedProps["nguoi_cap_nhat"] = String(uid);

      // ✅ QUAN TRỌNG: sửa xong phải đưa về chờ duyệt để admin quyết định có công bố lại không
      const roles = (
        JSON.parse(localStorage.getItem("webgis_roles") || "[]") || []
      ).map((r) => String(r).toLowerCase());
      const perms = (
        JSON.parse(
          localStorage.getItem("webgis_permissions") ||
            localStorage.getItem("webgis_perms") ||
            "[]",
        ) || []
      ).map((p) => String(p).toLowerCase());
      const isAdmin =
        roles.includes("admin") ||
        perms.includes("feature.approve") ||
        perms.includes("feature.publish") ||
        perms.includes("admin");

      updatedProps["trang_thai_du_lieu"] = isAdmin ? "nhap" : "cho_duyet";

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

// ✅ ISO không kèm timezone (đỡ lệch giờ)
function nowIsoNoTZ() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// ✅ workflow mặc định cho record mới: NHẬP
function wfInsertMetaXml(nsPrefix) {
  const now = nowIsoNoTZ();
  const uid = getUserIdFromToken();
  const uidXml = uid
    ? `
    <${nsPrefix}:nguoi_tao>${uid}</${nsPrefix}:nguoi_tao>
    <${nsPrefix}:nguoi_cap_nhat>${uid}</${nsPrefix}:nguoi_cap_nhat>
  `
    : "";

  const st = isAdmin() ? "nhap" : "cho_duyet"; // ✅ đúng theo RBAC // ✅ admin=nhap, cán bộ=cho_duyet

  return `
  <${nsPrefix}:trang_thai_du_lieu>${st}</${nsPrefix}:trang_thai_du_lieu>
  <${nsPrefix}:ngay_tao>${now}</${nsPrefix}:ngay_tao>
  ${uidXml}
  <${nsPrefix}:ngay_cap_nhat>${now}</${nsPrefix}:ngay_cap_nhat>
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
        alert("Lỗi khi sửa dữ liệu! Mở F12 để xem chi tiết.");
        console.log(data);
      } else {
        alert("✅ Cập nhật dữ liệu thành công!");
        map.closePopup();
        layerObj.setParams({ fake: Date.now() }, false);
      }
    })
    .catch((e) => {
      alert("❌ Update thất bại: " + e.message);
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
        alert("Lỗi khi xóa dữ liệu! Mở F12 để xem.");
        console.log(data);
      } else {
        alert("Đã xóa đối tượng khỏi Cơ sở dữ liệu thành công!");
        map.closePopup();
        layerObj.setParams({ fake: Date.now() }, false);
      }
    })
    .catch((e) => {
      alert("❌ Delete thất bại: " + e.message);
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
      new L.Draw.Polygon(map).enable();
    } else if (loaiHinh === "polyline") {
      new L.Draw.Polyline(map).enable();
    } else if (loaiHinh === "point") {
      new L.Draw.Marker(map).enable();
    }
    alert("Chọn vị trí trên bản đồ để vẽ/chấm điểm cho: " + taiNguyenDangChon);
  });
});

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
// =====================================================================
// ĐO ĐẠC (MEASURE)
// =====================================================================
let cheDoVe = "resource"; // "resource" | "measure"
let kieuDoDat = "distance"; // "distance" | "area"

var measureItems = new L.FeatureGroup();
map.addLayer(measureItems);

function tinhDoDaiPolyline(latlngs) {
  let sum = 0;
  for (let i = 1; i < latlngs.length; i++) {
    sum += map.distance(latlngs[i - 1], latlngs[i]);
  }
  return sum; // meters
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

map.on("draw:created", function (e) {
  var type = e.layerType;
  var layer = e.layer;

  // ✅ Nếu đang ở chế độ đo đạc -> xử lý đo và THOÁT luôn (không chạy thêm tài nguyên)
  if (cheDoVe === "measure") {
    measureItems.addLayer(layer);

    let html = `<h4 style="margin-top:0;color:#2e7d32;border-bottom:2px solid #4caf50;padding-bottom:5px;">Kết quả đo</h4>`;

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
      map.closePopup();
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
          map.closePopup();
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
            alert("Kiếp nạn! Không được để trống Tên đơn vị!");
            return;
          }

          phongDuLieuLenGeoServer(
            toaDo.lng,
            toaDo.lat,
            ten,
            loai,
            tinhTrang,
            truLuong,
            dienTich,
            diaChi,
            doiTuong,
          );
          map.closePopup();
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
          map.closePopup();
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
            alert("Kiếp nạn! Tên sinh vật không được để trống!");
            return;
          }

          phongDuLieuSinhVatLenGeoServer(
            toaDo.lng,
            toaDo.lat,
            tenBangDB,
            ten,
            phanLoai,
            nhom,
            viTri,
            nguyCap,
          );
          map.closePopup();
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
      formDivRung.innerHTML = `
        <h4 class="wfs-form-header" style="color: #2e7d32; border-color: #2e7d32;">THÊM TÀI NGUYÊN RỪNG</h4>
        <div class="wfs-form-group"><label>Tên rừng:</label><input type="text" id="inpTenRung" class="wfs-input" placeholder="Nhập tên rừng..."></div>
        <div class="wfs-form-group"><label>Nhóm rừng:</label><input type="text" id="inpNhomRung" class="wfs-input" placeholder="Ví dụ: Rừng tự nhiên..."></div>
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
          <button id="btnLuuRung" class="wfs-btn wfs-btn-save" style="background-color: #2e7d32;">💾 LƯU RỪNG</button>
        </div>
      `;

      layer.bindPopup(formDivRung).openPopup();

      formDivRung
        .querySelector("#btnHuyRung")
        .addEventListener("click", function () {
          map.closePopup();
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
            alert("Kiếp nạn! Tên rừng không được để trống!");
            return;
          }
          if (!nhom) nhom = "Chưa xác định";
          if (!dienTich || dienTich === "") dienTich = 0;

          phongDuLieuRungLenGeoServer(
            chuoiToaDo,
            ten,
            nhom,
            loai,
            tinhTrang,
            dienTich,
          );
          map.closePopup();
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
        <h4 class="wfs-form-header" style="color: #795548; border-color: #795548;">THÊM TÀI NGUYÊN ĐẤT</h4>
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
          <button id="btnLuuDat" class="wfs-btn wfs-btn-save" style="background-color: #795548;">💾 LƯU ĐẤT</button>
        </div>
      `;

      layer.bindPopup(formDivDat).openPopup();

      formDivDat
        .querySelector("#btnHuyDat")
        .addEventListener("click", function () {
          map.closePopup();
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
            alert("Kiếp nạn! Tên đất không được để trống!");
            return;
          }

          phongDuLieuDatLenGeoServer(
            chuoiToaDo,
            ten,
            loai,
            nhomsudung,
            dienTichHa,
            dienTichM2,
          );
          map.closePopup();
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
        <h4 class="wfs-form-header" style="color: #03a9f4; border-color: #03a9f4;">THÊM TÀI NGUYÊN NƯỚC</h4>
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
          <button id="btnLuuNuoc" class="wfs-btn wfs-btn-save" style="background-color: #03a9f4;">💾 LƯU NƯỚC</button>
        </div>
      `;

      layer.bindPopup(formDivNuoc).openPopup();

      formDivNuoc
        .querySelector("#btnHuyNuoc")
        .addEventListener("click", function () {
          map.closePopup();
          drawnItems.removeLayer(layer);
        });

      formDivNuoc
        .querySelector("#btnLuuNuoc")
        .addEventListener("click", function () {
          var ten = formDivNuoc.querySelector("#inpTenNuoc").value.trim();
          var loai = formDivNuoc.querySelector("#inpLoaiNuoc").value;
          var cap = formDivNuoc.querySelector("#inpCapNuoc").value;

          if (!ten) {
            alert("Kiếp nạn! Tên sông/kênh không được để trống!");
            return;
          }

          phongDuLieuNuocLenGeoServer(chuoiToaDo, ten, loai, cap);
          map.closePopup();
        });
    }
  }
});
// ==========================================
// PHẦN 5: TUYỆT KỸ WFS-T GỬI LÊN GEOSERVER
// ==========================================

function phongDuLieuLenGeoServer(
  kinhDo,
  viDo,
  tenTaiNguyen,
  loaiKhoangSan,
  tinhTrang,
  truLuong,
  dienTich,
  diaChi,
  doiTuongBaoVe,
) {
  const WORKSPACE = "angiang";
  const LAYER_NAME = "khoangsan_diem_mo";
  const WORKSPACE_URI = "http://angiang.vn";

  const x = Number(kinhDo);
  const y = Number(viDo);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    alert("❌ Kinh độ/Vĩ độ không hợp lệ!");
    return;
  }

  const truLuongNum = Number(String(truLuong ?? "").replace(",", "."));
  const dienTichNum = Number(String(dienTich ?? "").replace(",", "."));

  const truLuongSafe = Number.isFinite(truLuongNum) ? truLuongNum : 0;
  const dienTichSafe = Number.isFinite(dienTichNum) ? dienTichNum : 0;

  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:${WORKSPACE}="${WORKSPACE_URI}">
      <wfs:Insert>
        <${WORKSPACE}:${LAYER_NAME}>
          <${WORKSPACE}:geom>
            <gml:Point srsName="EPSG:4326">
              <gml:coordinates>${x},${y}</gml:coordinates>
            </gml:Point>
          </${WORKSPACE}:geom>

          <${WORKSPACE}:ten_don_vi>${xmlEscape(tenTaiNguyen)}</${WORKSPACE}:ten_don_vi>
          <${WORKSPACE}:loai_khoang_san>${xmlEscape(loaiKhoangSan)}</${WORKSPACE}:loai_khoang_san>
          <${WORKSPACE}:tinh_trang>${xmlEscape(tinhTrang)}</${WORKSPACE}:tinh_trang>
          <${WORKSPACE}:tru_luong>${truLuongSafe}</${WORKSPACE}:tru_luong>
          <${WORKSPACE}:dien_tich>${dienTichSafe}</${WORKSPACE}:dien_tich>
          <${WORKSPACE}:dia_chi>${xmlEscape(diaChi)}</${WORKSPACE}:dia_chi>
          <${WORKSPACE}:doi_tuong_bao_ve>${xmlEscape(doiTuongBaoVe)}</${WORKSPACE}:doi_tuong_bao_ve>
<${WORKSPACE}:nguon_du_lieu>${xmlEscape("WebGIS An Giang")}</${WORKSPACE}:nguon_du_lieu>
${wfInsertMetaXml(WORKSPACE)}
</${WORKSPACE}:${LAYER_NAME}>
      </wfs:Insert>
    </wfs:Transaction>`;

  console.log("WFST INSERT KHOANGSAN XML:", wfsTransaction);

  postWFST("insert", `${WORKSPACE}:${LAYER_NAME}`, wfsTransaction)
    .then((data) => {
      console.log("WFST INSERT KHOANGSAN RESPONSE:", data);
      if (wfstHasError(data)) {
        alert("❌ GeoServer trả lỗi. Mở F12 xem WFST RESPONSE!");
        console.log(data);
        return;
      }
      const ins = wfstTotalInserted(data);
      if (ins === 0) {
        alert(
          "❌ Không insert được bản ghi (totalInserted=0). Mở F12 xem RESPONSE!",
        );
        console.log(data);
        return;
      }
      alert("✅ Đã lưu thành công!");
      drawnItems.clearLayers();
    })
    .catch((e) => {
      alert("❌ Insert thất bại: " + e.message);
      console.error(e);
    });
}

function phongDuLieuRungLenGeoServer(
  chuoiToaDo,
  ten,
  nhom,
  loaiRung,
  tinhTrang,
  dienTich,
) {
  const WORKSPACE = "angiang";
  const LAYER_NAME = "rung";

  // ⚠️ URI này PHẢI khớp Workspace Namespace URI trong GeoServer
  const WORKSPACE_URI = "http://angiang.vn";

  const dt = Number(dienTich);
  const dienTichSafe = Number.isFinite(dt) ? dt : 0;

  const geomXml =
    `<${WORKSPACE}:geom>` +
    `<gml:MultiPolygon srsName="EPSG:4326">` +
    `<gml:polygonMember>` +
    `<gml:Polygon>` +
    `<gml:outerBoundaryIs>` +
    `<gml:LinearRing>` +
    `<gml:coordinates>${String(chuoiToaDo).trim()}</gml:coordinates>` +
    `</gml:LinearRing>` +
    `</gml:outerBoundaryIs>` +
    `</gml:Polygon>` +
    `</gml:polygonMember>` +
    `</gml:MultiPolygon>` +
    `</${WORKSPACE}:geom>`;

  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:${WORKSPACE}="${WORKSPACE_URI}">
      <wfs:Insert>
        <${WORKSPACE}:${LAYER_NAME}>
          ${geomXml}
          <${WORKSPACE}:ten>${xmlEscape(ten)}</${WORKSPACE}:ten>
          <${WORKSPACE}:nhom>${xmlEscape(nhom)}</${WORKSPACE}:nhom>
          <${WORKSPACE}:loai_rung>${xmlEscape(loaiRung)}</${WORKSPACE}:loai_rung>
          <${WORKSPACE}:tinh_trang>${xmlEscape(tinhTrang)}</${WORKSPACE}:tinh_trang>
          <${WORKSPACE}:dien_tich_ha>${dienTichSafe}</${WORKSPACE}:dien_tich_ha>
          <${WORKSPACE}:nguon_du_lieu>${xmlEscape("WebGIS An Giang")}</${WORKSPACE}:nguon_du_lieu>
${wfInsertMetaXml(WORKSPACE)}
</${WORKSPACE}:${LAYER_NAME}>
      </wfs:Insert>
    </wfs:Transaction>`;

  // ✅ thêm log để nhìn request khi fail
  console.log("WFST INSERT RUNG XML:", wfsTransaction);

  postWFST("insert", `${WORKSPACE}:${LAYER_NAME}`, wfsTransaction)
    .then((data) => {
      console.log("WFST INSERT RUNG RESPONSE:", data);
      if (data.includes("<wfs:Status>FAILED</wfs:Status>")) {
        alert("❌ Lỗi Rừng (GeoServer FAILED). Mở F12 xem RESPONSE!");
        return;
      }
      alert("✅ Đã lưu Rừng thành công!");
      drawnItems.clearLayers();
    })
    .catch((e) => {
      alert("❌ Insert thất bại: " + e.message);
      console.error(e);
    });
}

function phongDuLieuDatLenGeoServer(
  chuoiToaDo,
  ten,
  loaiDat,
  nhomsudung,
  dienTichHa,
  dienTichM2,
) {
  const WORKSPACE = "angiang";
  const LAYER_NAME = "dat";
  const WORKSPACE_URI = "http://angiang.vn";

  const haNum = Number(String(dienTichHa ?? "").replace(",", "."));
  const m2Num = Number(String(dienTichM2 ?? "").replace(",", "."));
  const dienTichHaSafe = Number.isFinite(haNum) ? haNum : 0;
  const dienTichM2Safe = Number.isFinite(m2Num) ? m2Num : 0;

  const geomXml =
    `<${WORKSPACE}:geom>` +
    `<gml:MultiPolygon srsName="EPSG:4326">` +
    `<gml:polygonMember><gml:Polygon><gml:outerBoundaryIs><gml:LinearRing>` +
    `<gml:coordinates>${String(chuoiToaDo).trim()}</gml:coordinates>` +
    `</gml:LinearRing></gml:outerBoundaryIs></gml:Polygon></gml:polygonMember>` +
    `</gml:MultiPolygon>` +
    `</${WORKSPACE}:geom>`;

  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:${WORKSPACE}="${WORKSPACE_URI}">
      <wfs:Insert>
        <${WORKSPACE}:${LAYER_NAME}>
          ${geomXml}
          <${WORKSPACE}:ten>${xmlEscape(ten)}</${WORKSPACE}:ten>
          <${WORKSPACE}:loai_dat_su_dung>${xmlEscape(loaiDat)}</${WORKSPACE}:loai_dat_su_dung>
          <${WORKSPACE}:nhom_su_dung>${xmlEscape(nhomsudung)}</${WORKSPACE}:nhom_su_dung>
          <${WORKSPACE}:dien_tich_ha>${dienTichHaSafe}</${WORKSPACE}:dien_tich_ha>
          <${WORKSPACE}:dien_tich_m2>${dienTichM2Safe}</${WORKSPACE}:dien_tich_m2>
          <${WORKSPACE}:nguon_du_lieu>${xmlEscape("WebGIS An Giang")}</${WORKSPACE}:nguon_du_lieu>
${wfInsertMetaXml(WORKSPACE)}
</${WORKSPACE}:${LAYER_NAME}>
      </wfs:Insert>
    </wfs:Transaction>`;

  console.log("WFST INSERT DAT XML:", wfsTransaction);

  postWFST("insert", `${WORKSPACE}:${LAYER_NAME}`, wfsTransaction)
    .then((data) => {
      console.log("WFST INSERT DAT RESPONSE:", data);
      if (wfstHasError(data)) {
        alert("❌ GeoServer trả lỗi. Mở F12 xem WFST RESPONSE!");
        console.log(data);
        return;
      }
      const ins = wfstTotalInserted(data);
      if (ins === 0) {
        alert(
          "❌ Không insert được bản ghi (totalInserted=0). Mở F12 xem RESPONSE!",
        );
        console.log(data);
        return;
      }
      alert("✅ Đã lưu thành công!");
      drawnItems.clearLayers();
    })
    .catch((e) => {
      alert("❌ Insert thất bại: " + e.message);
      console.error(e);
    });
}

function phongDuLieuNuocLenGeoServer(chuoiToaDo, ten, loai, cap) {
  const WORKSPACE = "angiang";
  const LAYER_NAME = "waterways";
  const WORKSPACE_URI = "http://angiang.vn";

  const capNum = Number(String(cap ?? "").replace(",", "."));
  const capSafe = Number.isFinite(capNum) ? capNum : xmlEscape(cap);

  const geomXml =
    `<${WORKSPACE}:geom>` +
    `<gml:MultiLineString srsName="EPSG:4326">` +
    `<gml:lineStringMember><gml:LineString>` +
    `<gml:coordinates>${String(chuoiToaDo).trim()}</gml:coordinates>` +
    `</gml:LineString></gml:lineStringMember>` +
    `</gml:MultiLineString>` +
    `</${WORKSPACE}:geom>`;

  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:${WORKSPACE}="${WORKSPACE_URI}">
      <wfs:Insert>
        <${WORKSPACE}:${LAYER_NAME}>
          ${geomXml}
          <${WORKSPACE}:ten>${xmlEscape(ten)}</${WORKSPACE}:ten>
          <${WORKSPACE}:loai>${xmlEscape(loai)}</${WORKSPACE}:loai>
          <${WORKSPACE}:cap>${capSafe}</${WORKSPACE}:cap>
          <${WORKSPACE}:nguon>${xmlEscape("WebGIS An Giang")}</${WORKSPACE}:nguon>
${wfInsertMetaXml(WORKSPACE)}
</${WORKSPACE}:${LAYER_NAME}>
      </wfs:Insert>
    </wfs:Transaction>`;

  console.log("WFST INSERT NUOC XML:", wfsTransaction);

  postWFST("insert", `${WORKSPACE}:${LAYER_NAME}`, wfsTransaction)
    .then((data) => {
      console.log("WFST INSERT NUOC RESPONSE:", data);
      if (wfstHasError(data)) {
        alert("❌ GeoServer trả lỗi. Mở F12 xem WFST RESPONSE!");
        console.log(data);
        return;
      }
      const ins = wfstTotalInserted(data);
      if (ins === 0) {
        alert(
          "❌ Không insert được bản ghi (totalInserted=0). Mở F12 xem RESPONSE!",
        );
        console.log(data);
        return;
      }
      alert("✅ Đã lưu thành công!");
      drawnItems.clearLayers();
    })
    .catch((e) => {
      alert("❌ Insert thất bại: " + e.message);
      console.error(e);
    });
}

function phongDuLieuSinhVatLenGeoServer(
  kinhDo,
  viDo,
  tenBang,
  ten,
  phanLoai,
  nhom,
  viTri,
  nguyCap,
) {
  const WORKSPACE = "angiang";
  const WORKSPACE_URI = "http://angiang.vn";

  // ✅ khóa lại để tránh gửi layer bậy bạ
  const allowed = new Set(["dongvat", "thucvat"]);
  if (!allowed.has(String(tenBang))) {
    alert("❌ Layer sinh vật không hợp lệ!");
    return;
  }

  const x = Number(kinhDo);
  const y = Number(viDo);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    alert("❌ Kinh độ/Vĩ độ không hợp lệ!");
    return;
  }

  const geomXml =
    `<${WORKSPACE}:geom>` +
    `<gml:Point srsName="EPSG:4326">` +
    `<gml:coordinates>${x},${y}</gml:coordinates>` +
    `</gml:Point>` +
    `</${WORKSPACE}:geom>`;

  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:${WORKSPACE}="${WORKSPACE_URI}">
      <wfs:Insert>
        <${WORKSPACE}:${tenBang}>
          ${geomXml}
          <${WORKSPACE}:ten_loai>${xmlEscape(ten)}</${WORKSPACE}:ten_loai>
          <${WORKSPACE}:phan_loai>${xmlEscape(phanLoai)}</${WORKSPACE}:phan_loai>
          <${WORKSPACE}:nhom>${xmlEscape(nhom)}</${WORKSPACE}:nhom>
          <${WORKSPACE}:vi_tri_phan_bo>${xmlEscape(viTri)}</${WORKSPACE}:vi_tri_phan_bo>
          <${WORKSPACE}:muc_do_nguy_cap>${xmlEscape(nguyCap)}</${WORKSPACE}:muc_do_nguy_cap>
${wfInsertMetaXml(WORKSPACE)}
</${WORKSPACE}:${tenBang}>
      </wfs:Insert>
    </wfs:Transaction>`;

  console.log("WFST INSERT SINHVAT XML:", wfsTransaction);

  postWFST("insert", `${WORKSPACE}:${tenBang}`, wfsTransaction)
    .then((data) => {
      console.log("WFST INSERT SINHVAT RESPONSE:", data);
      if (wfstHasError(data)) {
        alert("❌ GeoServer trả lỗi. Mở F12 xem WFST RESPONSE!");
        console.log(data);
        return;
      }
      const ins = wfstTotalInserted(data);
      if (ins === 0) {
        alert(
          "❌ Không insert được bản ghi (totalInserted=0). Mở F12 xem RESPONSE!",
        );
        console.log(data);
        return;
      }
      alert("✅ Đã lưu thành công!");
      drawnItems.clearLayers();
    })
    .catch((e) => {
      alert("❌ Insert thất bại: " + e.message);
      console.error(e);
    });
}

// ==========================================
// PHẦN 6: TÌM KIẾM ĐA LUỒNG VÀ HIỂN THỊ FULL POPUP
// ==========================================
const inpSearch = document.getElementById("inpSearch");
const btnSearch = document.getElementById("btnSearch");
const searchResults = document.getElementById("searchResults");

// ✅ Helper: bỏ dấu + viết thường (để nhận "rung" = "rừng" khi tìm theo loại tài nguyên)
function boDauVaThuong(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ✅ Helper: chọn field hiển thị đẹp nhất cho từng lớp
function chonGiaTriDauTien(props, fields) {
  for (const f of fields) {
    const v = props?.[f];
    if (v !== null && v !== undefined && String(v).trim() !== "")
      return String(v);
  }
  return "";
}

function thucThiTimKiem() {
  const queryRaw = inpSearch.value.trim();
  if (!queryRaw) return;

  const queryNorm = boDauVaThuong(queryRaw);
  // Escape nháy đơn cho CQL (tránh lỗi khi người dùng gõ ký tự ')
  const qCql = queryRaw.replace(/'/g, "''");

  const MAX_PER_LAYER = 200; // tăng/giảm tuỳ dữ liệu

  // 1) Cấu hình: tìm theo thuộc tính + cho phép "tìm theo loại/lớp tài nguyên"
  const cacLopCanTim = [
    {
      typeKey: "dongvat",
      layer: "angiang:dongvat",
      cols: ["nhom", "ten_loai"],
      nameFields: ["ten_loai", "nhom", "phan_loai"],
      label: "Động vật",
      keywords: ["dong vat", "động vật", "animal"],
    },
    {
      typeKey: "thucvat",
      layer: "angiang:thucvat",
      cols: ["nhom", "ten_loai"],
      nameFields: ["ten_loai", "nhom", "phan_loai"],
      label: "Thực vật",
      keywords: ["thuc vat", "thực vật", "plant"],
    },
    {
      typeKey: "rung",
      layer: "angiang:rung",
      cols: ["ten", "loai_rung"],
      nameFields: ["ten", "loai_rung"],
      label: "Rừng",
      keywords: ["rung", "rừng", "forest"],
    },
    {
      typeKey: "dat",
      layer: "angiang:dat",
      cols: ["ten", "nhom_su_dung"],
      nameFields: ["ten", "nhom_su_dung", "loai_dat_su_dung"],
      label: "Đất",
      keywords: ["dat", "đất", "land"],
    },
    {
      typeKey: "nuoc",
      layer: "angiang:waterways",
      cols: ["ten", "loai"],
      nameFields: ["ten", "loai"],
      label: "Nước",
      keywords: ["nuoc", "nước", "song", "suoi", "river", "water"],
    },
    {
      typeKey: "khoangsan",
      layer: "angiang:khoangsan_diem_mo",
      cols: ["ten_don_vi", "loai_khoang_san"],
      nameFields: ["ten_don_vi", "loai_khoang_san"],
      label: "Khoáng sản",
      keywords: ["khoang san", "khoáng sản", "mo", "mỏ", "mine", "mineral"],
    },
  ];

  // ✅ Nhận diện: người dùng đang tìm theo "lớp/loại tài nguyên" hay theo "thuộc tính"
  const isTypeMatch = (cfg) => {
    const labelNorm = boDauVaThuong(cfg.label);
    if (queryNorm === labelNorm) return true;
    if (queryNorm === boDauVaThuong(cfg.typeKey)) return true;
    if (
      Array.isArray(cfg.keywords) &&
      cfg.keywords.some((k) => boDauVaThuong(k) === queryNorm)
    )
      return true;
    return false;
  };

  const lopTheoLoai = cacLopCanTim.filter(isTypeMatch);
  const targets = lopTheoLoai.length ? lopTheoLoai : cacLopCanTim;

  searchResults.classList.remove("hidden");
  searchResults.innerHTML =
    "<div class='search-item'>⏳ Đang tìm kiếm...</div>";

  const promises = targets.map((cfg) => {
    const urlBase =
      `/myproxy/angiang/ows?service=WFS&version=1.0.0&request=GetFeature` +
      `&typeName=${cfg.layer}&outputFormat=application/json&maxFeatures=${MAX_PER_LAYER}`;

    // Nếu đang tìm theo loại tài nguyên (vd: gõ "rừng") => lấy tất cả đối tượng của lớp đó (giới hạn MAX_PER_LAYER)
    // Nếu tìm theo thuộc tính => dùng CQL_FILTER như cũ
    let url = urlBase;

    // ✅ Luôn lọc chỉ dữ liệu đã công bố (dù tìm theo loại hay theo thuộc tính)
    if (lopTheoLoai.length) {
      // tìm theo loại: lấy tất cả đối tượng nhưng vẫn chỉ lấy "cong_bo"
      url = urlBase + `&CQL_FILTER=${encodeURIComponent(CQL_CONG_BO)}`;
    } else {
      // tìm theo thuộc tính: (cong_bo) AND (từ khóa)
      const filter = cfg.cols.map((c) => `${c} ILIKE '%${qCql}%'`).join(" OR ");
      const filterFull = `(${CQL_CONG_BO}) AND (${filter})`;
      url = urlBase + `&CQL_FILTER=${encodeURIComponent(filterFull)}`;
    }

    return fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const feats = Array.isArray(data.features) ? data.features : [];
        return feats.map((f) => {
          const tenHienThi =
            chonGiaTriDauTien(f.properties, cfg.nameFields) || "Không xác định";
          return {
            ten: tenHienThi,
            loai: cfg.label,
            tieuDe: cfg.label,
            layerName: cfg.layer,
            feature: f,
          };
        });
      })
      .catch(() => []);
  });

  Promise.all(promises).then((mangKetQua) => {
    let tatCaKetQua = mangKetQua.flat();

    // ✅ Lọc trùng (nếu có)
    const seen = new Set();
    tatCaKetQua = tatCaKetQua.filter((it) => {
      const fid = it.feature?.id ?? it.feature?.properties?.id ?? it.ten;
      const key = `${it.loai}|${fid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ✅ Sắp xếp: item có tên chứa query đứng trước (khi tìm theo thuộc tính)
    if (!lopTheoLoai.length) {
      const qn = boDauVaThuong(queryRaw);
      tatCaKetQua.sort((a, b) => {
        const an = boDauVaThuong(a.ten);
        const bn = boDauVaThuong(b.ten);
        const as = an.includes(qn) ? 1 : 0;
        const bs = bn.includes(qn) ? 1 : 0;
        return bs - as;
      });
    }

    searchResults.innerHTML = "";

    if (tatCaKetQua.length === 0) {
      searchResults.innerHTML =
        "<div class='search-item' style='color:#d32f2f;'>❌ Không tìm thấy kết quả!</div>";
      return;
    }

    // ✅ Render theo nhóm tài nguyên (nhìn đỡ “sai lệch”)
    const group = new Map();
    tatCaKetQua.forEach((it) => {
      if (!group.has(it.loai)) group.set(it.loai, []);
      group.get(it.loai).push(it);
    });

    group.forEach((items, loai) => {
      const header = document.createElement("div");
      header.className = "search-item search-header";
      header.innerHTML = `📌 ${loai} <small>(${items.length} kết quả)</small>`;
      searchResults.appendChild(header);

      items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<b>${item.ten}</b><small>Tài nguyên: ${item.loai}</small>`;

        div.addEventListener("click", function () {
          const geojsonLayer = L.geoJSON(item.feature);
          const tamDiem = geojsonLayer.getBounds().getCenter();
          const meta = damBaoLopWmsDangBat(item.layerName); // bật WMS trước để nó kịp load
          const tieuDe =
            item.tieuDe || meta?.tieuDe || item.loai || "Tài nguyên";
          map.flyTo(tamDiem, 15, { duration: 1.5 });

          setTimeout(() => {
            const meta = damBaoLopWmsDangBat(item.layerName);
            const tieuDe =
              item.tieuDe || meta?.tieuDe || item.loai || "Tài nguyên";
            const block = taoPopupThongTin(
              item.feature,
              tieuDe,
              item.layerName,
              meta?.layerObj,
            );
            L.popup().setLatLng(tamDiem).setContent(block).openOn(map);
          }, 1500);

          searchResults.classList.add("hidden");
        });

        searchResults.appendChild(div);
      });
    });

    // Gợi ý khi user tìm theo loại và dữ liệu quá nhiều
    if (lopTheoLoai.length && tatCaKetQua.length >= MAX_PER_LAYER) {
      const tip = document.createElement("div");
      tip.className = "search-item search-tip";
      tip.innerHTML = `ℹ️ Đang hiển thị tối đa ${MAX_PER_LAYER} kết quả. Muốn “đủ hết” thì tăng MAX_PER_LAYER hoặc bổ sung phân trang.`;
      searchResults.appendChild(tip);
    }
  });
}

btnSearch.addEventListener("click", thucThiTimKiem);
inpSearch.addEventListener("keypress", function (e) {
  if (e.key === "Enter") thucThiTimKiem();
});
document.addEventListener("click", function (e) {
  if (!e.target.closest(".navbar-search"))
    searchResults.classList.add("hidden");
});
// =========================================================
// 7. LOGIC TRUY VẤN NÂNG CAO (GIAO TIẾP VỚI GEOSERVER)
// =========================================================
var resultLayer = new L.FeatureGroup().addTo(map);

// 1. Quản lý bảng Truy vấn
const bangTruyVan = document.getElementById("bangTruyVan");
const btnDongTruyVan = document.getElementById("btnDongTruyVan");
// ✅ Chặn click/scroll từ panel rớt xuống map (Leaflet.draw hay nuốt click)
if (window.L && bangTruyVan) {
  L.DomEvent.disableClickPropagation(bangTruyVan);
  L.DomEvent.disableScrollPropagation(bangTruyVan);
}

// 👉 TÍNH NĂNG THOÁT TRUY VẤN KHI NHẤN DẤU X (CẬP NHẬT MỚI)
btnDongTruyVan.addEventListener("click", () => {
  // 1. Giấu bảng truy vấn đi
  bangTruyVan.classList.add("hidden");

  // 2. QUAN TRỌNG: Quét sạch các vùng/điểm kết quả trên bản đồ
  resultLayer.clearLayers();

  // 3. Đưa danh sách kết quả về trạng thái ban đầu
  const lstKetQua = document.getElementById("lstKetQua");
  if (lstKetQua) {
    lstKetQua.innerHTML = `
      <div class='empty-result'>Chưa có dữ liệu. Vui lòng thực hiện truy vấn!</div>
    `;
  }

  // 4. Reset số lượng kết quả hiện tại về con số 0
  const txtCount = document.getElementById("txtCount");
  if (txtCount) {
    txtCount.innerText = "0";
  }

  // 5. Tự động chuyển về Tab "Truy vấn" để lần sau mở ra cho chuẩn
  const tabBtns = bangTruyVan.querySelectorAll(".tab-btn");
  if (tabBtns.length > 0) {
    tabBtns[0].click();
  }
});

// 2. Logic Chuyển Tab (Đã sửa lỗi không làm ảnh hưởng đến bảng Thống kê)
const tabBtns = bangTruyVan.querySelectorAll(".tab-btn");
const tabContents = bangTruyVan.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Chỉ xử lý các Tab bên trong bảng Truy vấn
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    const targetContent = bangTruyVan.querySelector("#" + targetId);
    if (targetContent) {
      targetContent.classList.add("active");
    }
  });
});

// --- TUYỆT KỸ LỌC TÌNH TRẠNG THÔNG MINH (ĐÃ ĐỦ 6 LỚP) ---
const CAU_HINH_LOC_DONG = {
  "angiang:khoangsan_diem_mo": {
    tieuDe: "LỌC THEO TÌNH TRẠNG",
    cotDB: "tinh_trang",
    danhSach: [
      "Đang khai thác",
      "Chưa khai thác",
      "Tạm dừng khai thác",
      "Đóng cửa mỏ",
    ],
  },
  "angiang:rung": {
    tieuDe: "LỌC THEO TÌNH TRẠNG",
    cotDB: "tinh_trang",
    danhSach: [
      "Ổn định - Bảo vệ",
      "Cảnh báo cháy",
      "Đang cháy",
      "Bị suy thoái",
      "Đang tái sinh",
    ],
  },
  "angiang:dongvat": {
    tieuDe: "MỨC ĐỘ NGUY CẤP",
    cotDB: "muc_do_nguy_cap",
    danhSach: [
      "Ít quan tâm (LC)",
      "Sắp nguy cấp (VU)",
      "Nguy cấp (EN)",
      "Cực kỳ nguy cấp (CR)",
    ],
  },
  "angiang:thucvat": {
    tieuDe: "MỨC ĐỘ NGUY CẤP",
    cotDB: "muc_do_nguy_cap",
    danhSach: [
      "Ít quan tâm (LC)",
      "Sắp nguy cấp (VU)",
      "Nguy cấp (EN)",
      "Cực kỳ nguy cấp (CR)",
    ],
  },
  "angiang:dat": {
    tieuDe: "NHÓM SỬ DỤNG ĐẤT",
    cotDB: "nhom_su_dung",
    danhSach: ["Đất nông nghiệp", "Đất phi nông nghiệp", "Đất chưa sử dụng"],
  },
  "angiang:waterways": {
    tieuDe: "CẤP ĐỘ SÔNG/KÊNH",
    cotDB: "cap",
    danhSach: ["chính", "nhánh"],
  },
};

const cboLopDuLieu = document.getElementById("cboLopDuLieu");
const cboTinhTrang = document.getElementById("cboTinhTrang");
const khungLocTinhTrang = document.getElementById("khungLocTinhTrang");
const lblTinhTrang = document.getElementById("lblTinhTrang");

function capNhatOChonTinhTrang() {
  let lopDangChon = cboLopDuLieu.value;
  let cauHinh = CAU_HINH_LOC_DONG[lopDangChon];
  cboTinhTrang.innerHTML = '<option value="all">-- Tất cả --</option>';

  if (cauHinh) {
    khungLocTinhTrang.style.display = "block";
    lblTinhTrang.innerText = cauHinh.tieuDe;
    cauHinh.danhSach.forEach((tt) => {
      let opt = document.createElement("option");
      opt.value = tt;
      opt.innerText = tt;
      cboTinhTrang.appendChild(opt);
    });
  } else {
    khungLocTinhTrang.style.display = "none";
  }
}
cboLopDuLieu.addEventListener("change", capNhatOChonTinhTrang);
capNhatOChonTinhTrang(); // Chạy lần đầu

// --- LỆNH TRUY VẤN LÊN MÁY CHỦ ---
const btnApDung = document.getElementById("btnApDung");

btnApDung?.addEventListener("click", (e) => {
  // ✅ chặn cho chắc (tránh Leaflet/Draw bắt click)
  if (window.L) L.DomEvent.stop(e);
  else {
    e.preventDefault?.();
    e.stopPropagation?.();
  }

  const chonLop = cboLopDuLieu.value;
  const chonTinhTrang = cboTinhTrang.value;
  const tuKhoaRaw = document.getElementById("txtTuKhoa").value.trim();
  const tuKhoa = tuKhoaRaw.replace(/'/g, "''"); // escape CQL

  let cqlArray = [];

  // ✅ Luôn chỉ truy vấn dữ liệu đã công bố (giữ như bạn đang làm)
  cqlArray.push(CQL_CONG_BO);

  const cauHinhDong = CAU_HINH_LOC_DONG[chonLop];

  if (chonTinhTrang !== "all" && cauHinhDong) {
    cqlArray.push(`${cauHinhDong.cotDB} = '${chonTinhTrang}'`);
  }

  if (tuKhoa !== "") {
    if (chonLop === "angiang:khoangsan_diem_mo")
      cqlArray.push(`ten_don_vi ILIKE '%${tuKhoa}%'`);
    else if (
      chonLop === "angiang:rung" ||
      chonLop === "angiang:dat" ||
      chonLop === "angiang:waterways"
    )
      cqlArray.push(`ten ILIKE '%${tuKhoa}%'`);
    else if (chonLop === "angiang:dongvat" || chonLop === "angiang:thucvat")
      cqlArray.push(`ten_loai ILIKE '%${tuKhoa}%'`);
  }

  const cqlString =
    cqlArray.length > 0
      ? `&CQL_FILTER=${encodeURIComponent(cqlArray.join(" AND "))}`
      : "";

  const urlWFSQuery =
    `/myproxy/angiang/ows?service=WFS&version=1.1.0&request=GetFeature` +
    `&typeName=${chonLop}&outputFormat=application/json${cqlString}`;

  btnApDung.innerHTML = "⏳ ĐANG LẤY DỮ LIỆU...";

  fetch(urlWFSQuery)
    .then((res) => res.text())
    .then((text) => {
      if (text.startsWith("<") || text.includes("Exception")) {
        console.error("Lỗi XML:", text);
        alert("Lệnh truy vấn bị lỗi, hãy xem F12!");
        btnApDung.innerHTML = "ÁP DỤNG LỌC DỮ LIỆU";
        return;
      }

      const data = JSON.parse(text);
      HienThiKetQuaTruyVan(data.features, chonLop);
      btnApDung.innerHTML = "ÁP DỤNG LỌC DỮ LIỆU";

      // ✅ chuyển tab “Kết quả” nhưng không phụ thuộc tabBtns biến global
      bangTruyVan?.querySelector('.tab-btn[data-target="tabKetQua"]')?.click();
    })
    .catch((err) => {
      console.error(err);
      btnApDung.innerHTML = "ÁP DỤNG LỌC DỮ LIỆU";
      alert("Lỗi mạng!");
    });
});

// --- VẼ UI KẾT QUẢ CỰC XỊN ---
function HienThiKetQuaTruyVan(features, lop) {
  const lstKetQua = document.getElementById("lstKetQua");
  document.getElementById("txtCount").innerText = features
    ? features.length
    : 0;
  lstKetQua.innerHTML = "";
  resultLayer.clearLayers();

  if (!features || features.length === 0) {
    lstKetQua.innerHTML =
      "<div class='empty-result'>❌ Không tìm thấy dữ liệu!</div>";
    return;
  }

  let icon = "📍",
    nhanLop = "Tài nguyên";
  if (lop.includes("khoangsan")) {
    icon = "⛏️";
    nhanLop = "Khoáng sản";
  } else if (lop.includes("rung")) {
    icon = "🌳";
    nhanLop = "Rừng";
  } else if (lop.includes("dongvat")) {
    icon = "🐅";
    nhanLop = "Động vật";
  } else if (lop.includes("dat")) {
    icon = "🟤";
    nhanLop = "Đất";
  } else if (lop.includes("waterways")) {
    icon = "💧";
    nhanLop = "Nước";
  } else if (lop.includes("thucvat")) {
    icon = "🌿";
    nhanLop = "Thực vật";
  }

  features.forEach((f) => {
    let props = f.properties;
    let ten =
      props.ten || props.ten_don_vi || props.ten_loai || "Không xác định";

    let chiTietHtml = "";
    let dongHienThi = 0;
    for (let key in props) {
      if (
        key !== "bbox" &&
        key !== "geom" &&
        key !== "id" &&
        key !== "ten" &&
        key !== "ten_don_vi" &&
        key !== "ten_loai" &&
        props[key]
      ) {
        if (dongHienThi < 3) {
          let tenDep = TU_DIEN_COT[key] || key;
          chiTietHtml += `<p style="margin: 3px 0; font-size: 12px; color: #555;"><b>${tenDep}:</b> ${props[key]}</p>`;
          dongHienThi++;
        }
      }
    }

    let div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 20px; background: #e8f5e9; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${icon}</div>
          <div style="flex: 1;">
              <h4 style="margin: 0 0 5px 0; color: #2e7d32; font-size: 14px;">${ten}</h4>
              <span style="display: inline-block; background: #c8e6c9; color: #1b5e20; font-size: 10px; padding: 2px 8px; border-radius: 12px; margin-bottom: 6px; font-weight: bold;">${nhanLop}</span>
              ${chiTietHtml}
          </div>
      </div>
    `;

    let geojsonLayer = L.geoJSON(f, {
      style: () => ({ opacity: 0, fillOpacity: 0, weight: 0 }),
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, { radius: 0, opacity: 0, fillOpacity: 0 }),
    });
    resultLayer.addLayer(geojsonLayer);

    div.addEventListener("click", () => {
      var tamDiem = geojsonLayer.getBounds().getCenter();
      map.flyTo(tamDiem, 15, { duration: 1.5 });

      setTimeout(() => {
        const meta = damBaoLopWmsDangBat(lop);
        const tieuDe = meta?.tieuDe || nhanLop || "Tài nguyên";
        const block = taoPopupThongTin(f, tieuDe, lop, meta?.layerObj);
        L.popup().setLatLng(tamDiem).setContent(block).openOn(map);
      }, 1500);
    });
    lstKetQua.appendChild(div);
  });
  map.fitBounds(resultLayer.getBounds(), { padding: [50, 50] });
}
// =====================================================================
// TÍNH NĂNG THỐNG KÊ BIỂU ĐỒ (CHART.JS)
// =====================================================================
let chartHienTai = null;
let currentReportFeatures = []; // Biến hứng dữ liệu để lát in Báo Cáo
let currentReportLayerName = "";
const btnThongKe = document.getElementById("btnThongKe");
const danhSachThongKe = document.getElementById("danhSachThongKe");
const panelThongKe = document.getElementById("panelThongKe");
const btnDongThongKe = document.getElementById("btnDongThongKe");

// =====================================================================
// THANH CÔNG CỤ (TẮT/MỞ ĐỒNG BỘ 3 NÚT) - FIX
// =====================================================================

// 1. Lấy các phần tử DOM
const uiBtnThem = document.getElementById("btnThemTaiNguyen");
const uiPanelThem = document.getElementById("danhSachTaiNguyen");

const uiBtnTruyVan = document.getElementById("btnMoTruyVan");
const uiPanelTruyVan = document.getElementById("bangTruyVan");

const uiBtnThongKe = document.getElementById("btnThongKe");
const uiListThongKe = document.getElementById("danhSachThongKe");
const uiDashThongKe = document.getElementById("panelThongKe");

const uiBtnDoDat = document.getElementById("btnDoDat");
const uiPanelDoDat = document.getElementById("danhSachDoDat");
// 2. Hàm dọn dẹp: Tắt tất cả các bảng, ngoại trừ bảng đang được chỉ định
function tatTatCaMenuTru(menuGiuLai) {
  if (menuGiuLai !== "Them") uiPanelThem?.classList.add("hidden");
  if (menuGiuLai !== "TruyVan") uiPanelTruyVan?.classList.add("hidden");
  if (menuGiuLai !== "ThongKe") {
    uiListThongKe?.classList.add("hidden");
    uiDashThongKe?.classList.add("hidden");
  }
  if (menuGiuLai !== "DoDat") uiPanelDoDat?.classList.add("hidden");
}

// 3. Nút THÊM (+)
uiBtnThem?.addEventListener("click", () => {
  if (!hasPerm("feature.insert")) {
    alert("🔒 Bạn không có quyền Thêm dữ liệu.");
    return;
  }

  const dangAn = uiPanelThem.classList.contains("hidden");
  tatTatCaMenuTru("Them");
  if (dangAn) uiPanelThem.classList.remove("hidden");
  else uiPanelThem.classList.add("hidden");
});

// 4. Nút TRUY VẤN (🔍) ✅ FIX đúng nút
uiBtnTruyVan?.addEventListener("click", () => {
  const dangAn = uiPanelTruyVan.classList.contains("hidden");
  tatTatCaMenuTru("TruyVan");
  if (dangAn) uiPanelTruyVan.classList.remove("hidden");
  else uiPanelTruyVan.classList.add("hidden");
});

// 5. Nút THỐNG KÊ (📊)
uiBtnThongKe?.addEventListener("click", () => {
  if (!hasPerm("stats.view")) {
    alert("🔒 Bạn không có quyền xem Thống kê.");
    return;
  }

  const dangAn = uiListThongKe.classList.contains("hidden");
  tatTatCaMenuTru("ThongKe");
  if (dangAn) uiListThongKe.classList.remove("hidden");
  else uiListThongKe.classList.add("hidden");
});

uiBtnDoDat?.addEventListener("click", () => {
  // ✅ Chỉ cán bộ (feature.insert) hoặc admin (admin.users) mới được đo đạc
  if (!hasPerm("feature.insert") && !hasPerm("admin.users")) {
    alert("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
    return;
  }

  const dangAn = uiPanelDoDat.classList.contains("hidden");
  tatTatCaMenuTru("DoDat");
  if (dangAn) uiPanelDoDat.classList.remove("hidden");
  else uiPanelDoDat.classList.add("hidden");
});
// Nút tắt bảng thống kê
btnDongThongKe.addEventListener("click", () => {
  panelThongKe.classList.add("hidden");
});

// Sự kiện khi bấm vào từng lớp trong danh sách
document.querySelectorAll(".stat-select-item").forEach((item) => {
  item.onclick = function () {
    const lopId = this.getAttribute("data-lop");
    const tenHienThi = this.getAttribute("data-ten");

    danhSachThongKe.classList.add("hidden");
    panelThongKe.classList.remove("hidden");

    thucThiThongKeLop(lopId, tenHienThi);
  };
});

// Hàm gọi GeoServer và tính toán
async function thucThiThongKeLop(lopId, tenLop) {
  document.getElementById("txtTenLopThongKe").innerText =
    "📊 Thống kê: " + tenLop;
  const loader = document.getElementById("statLoader");
  const container = document.getElementById("statContainer");

  loader.style.display = "block";
  container.classList.add("hidden");

  try {
    let keyPhanLoai = "";
    if (lopId.includes("khoangsan")) keyPhanLoai = "tinh_trang";
    else if (lopId.includes("rung")) keyPhanLoai = "loai_rung";
    else if (lopId.includes("dongvat") || lopId.includes("thucvat"))
      keyPhanLoai = "muc_do_nguy_cap";
    else if (lopId.includes("dat")) keyPhanLoai = "loai_dat_su_dung";
    else if (lopId.includes("waterways")) keyPhanLoai = "loai";

    // Gọi dữ liệu từ máy chủ
    const url = `/myproxy/angiang/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=${lopId}&outputFormat=application/json&maxFeatures=2000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Mất kết nối mạng");

    const data = await res.json();
    const features = data.features || [];
    let total = data.totalFeatures || features.length;
    // Gán dữ liệu vào biến để dùng cho nút Báo cáo
    currentReportFeatures = features;
    currentReportLayerName = tenLop;
    // Đếm gom nhóm
    let dict = {};
    features.forEach((f) => {
      let val = f.properties[keyPhanLoai] || "Chưa xác định";
      dict[val] = (dict[val] || 0) + 1;
    });

    veBieuDo(Object.keys(dict), Object.values(dict));

    document.getElementById("statSummaryText").innerHTML = `
        <strong>✅ Báo cáo tự động:</strong><br>
        Hệ thống đang lưu trữ tổng cộng <b style="color:#d32f2f; font-size:16px;">${total}</b> đối tượng thuộc lớp <b>${tenLop}</b>.<br><br>
        <i>Tiêu chí phân loại: ${keyPhanLoai.replace(/_/g, " ").toUpperCase()}.</i>
    `;

    loader.style.display = "none";
    container.classList.remove("hidden");
  } catch (err) {
    console.error("Lỗi thống kê:", err);
    loader.innerHTML =
      "<div style='color:red; font-weight:bold;'>❌ Lỗi lấy dữ liệu từ GeoServer! Vui lòng bật Live Server.</div>";
  }
}

// Hàm vẽ biểu đồ
function veBieuDo(labels, data) {
  const ctx = document.getElementById("chartChinh").getContext("2d");

  if (chartHienTai) chartHienTai.destroy();

  const colors = [
    "#4caf50",
    "#2196f3",
    "#ff9800",
    "#f44336",
    "#9c27b0",
    "#795548",
    "#00bcd4",
  ];

  chartHienTai = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        { data: data, backgroundColor: colors, borderWidth: 1, hoverOffset: 8 },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 13 } } },
        title: {
          display: true,
          text: "BIỂU ĐỒ PHÂN LOẠI CHI TIẾT",
          font: { size: 14 },
        },
      },
      cutout: "55%",
    },
  });
}
// =====================================================================
// LOGIC MỞ TRANG BÁO CÁO ĐỘC LẬP (CHỐNG TREO TRÌNH DUYỆT)
// =====================================================================
document.getElementById("btnMoBaoCao").addEventListener("click", () => {
  if (currentReportFeatures.length === 0) {
    alert("Chưa có dữ liệu để lập báo cáo!");
    return;
  }

  // 1. Gói dữ liệu truyền sang trang baocao.html
  const dataToExport = {
    layerName: currentReportLayerName,
    features: currentReportFeatures,
    date: new Date().toLocaleDateString("vi-VN"),
    dictionary: TU_DIEN_COT, // Đưa luôn từ điển sang để trang kia dịch tên cột
  };

  // 2. Lưu vào bộ nhớ tạm
  sessionStorage.setItem("webgis_report_data", JSON.stringify(dataToExport));

  // 3. Mở tab mới
  window.open("baocao.html", "_blank");
});
document.querySelectorAll(".measure-item").forEach((el) => {
  el.addEventListener("click", function () {
    if (!hasPerm("feature.insert") && !hasPerm("admin.users")) {
      alert("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
      return;
    }

    kieuDoDat = this.getAttribute("data-type"); // distance | area
    cheDoVe = "measure";
    taiNguyenDangChon = "";
    document.getElementById("danhSachDoDat")?.classList.add("hidden");

    if (kieuDoDat === "distance") {
      new L.Draw.Polyline(map).enable();
      alert("📏 Chọn các điểm để đo khoảng cách (double click để kết thúc).");
    } else {
      new L.Draw.Polygon(map).enable();
      alert("📐 Vẽ vùng để đo diện tích (double click để kết thúc).");
    }
  });
});

document.getElementById("btnClearMeasure")?.addEventListener("click", () => {
  if (!hasPerm("feature.insert") && !hasPerm("admin.users")) {
    alert("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
    return;
  }

  measureItems.clearLayers();
  map.closePopup();
  document.getElementById("danhSachDoDat")?.classList.add("hidden");
});
