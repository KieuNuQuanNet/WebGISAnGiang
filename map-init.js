// js/map-init.js
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

AppGIS.layers.rung = L.tileLayer.wms(urlWMS, {
  layers: "angiang:rung",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

AppGIS.layers.nuoc = L.tileLayer.wms(urlWMS, {
  layers: "angiang:waterways",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

AppGIS.layers.dat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:dat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

AppGIS.layers.khoangsan = L.tileLayer.wms(urlWMS, {
  layers: "angiang:khoangsan_diem_mo",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

AppGIS.layers.dongvat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:dongvat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

AppGIS.layers.thucvat = L.tileLayer.wms(urlWMS, {
  layers: "angiang:thucvat",
  format: "image/png",
  transparent: true,
  version: "1.1.0",
  CQL_FILTER: CQL_CONG_BO,
});

// =====================================================================
// PHẦN 3: KHỞI TẠO BẢN ĐỒ VÀ THIẾT LẬP GÓC NHÌN
// =====================================================================

AppGIS.map = L.map("map", {
  center: [10.3711, 105.4328],
  zoom: 11,
  layers: [osmLayer],
});

var marker = L.marker([10.3711, 105.4328]).addTo(AppGIS.map);
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

    container.innerHTML = `
      <a class="leaflet-control-layers-toggle" href="#" title="Layers"></a>
      <form class="leaflet-control-layers-list layer-control-list">
        
        <div class="leaflet-control-layers-base">
          <div class="lop-ban-do"><label><input type="radio" name="basemap" value="osm" checked> <span> Bản đồ Đường phố (OSM)</span></label></div>
          <div class="lop-ban-do"><label><input type="radio" name="basemap" value="google"> <span> Bản đồ Vệ tinh (Google)</span></label></div>
        </div>

        <div class="leaflet-control-layers-separator list-separator"></div>

        <div class="leaflet-control-layers-overlays">
          
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

AppGIS.map.addControl(new CustomLayerControl());

document.querySelectorAll('input[name="basemap"]').forEach((radio) => {
  radio.addEventListener("change", function () {
    if (this.value === "osm") {
      AppGIS.map.addLayer(osmLayer);
      AppGIS.map.removeLayer(googleSatLayer);
    } else {
      AppGIS.map.addLayer(googleSatLayer);
      AppGIS.map.removeLayer(osmLayer);
    }
  });
});

window.toggleBoLoc = function (boxId, arrowId) {
  document.getElementById(boxId).classList.toggle("hidden");
  document.getElementById(arrowId).classList.toggle("open");
};
