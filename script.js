// =========================================================
// 7. LOGIC TRUY VẤN NÂNG CAO (GIAO TIẾP VỚI GEOSERVER)
// =========================================================
AppGIS.resultLayer = new L.FeatureGroup().addTo(AppGIS.map);

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
  AppGIS.resultLayer.clearLayers();

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
    khungLocTinhTrang.classList.remove("hidden");
    lblTinhTrang.innerText = cauHinh.tieuDe;
    cauHinh.danhSach.forEach((tt) => {
      let opt = document.createElement("option");
      opt.value = tt;
      opt.innerText = tt;
      cboTinhTrang.appendChild(opt);
    });
  } else {
    khungLocTinhTrang.classList.add("hidden");
  }
}
cboLopDuLieu.addEventListener("change", capNhatOChonTinhTrang);
capNhatOChonTinhTrang(); // Chạy lần đầu

// --- LỆNH TRUY VẤN LÊN MÁY CHỦ ---
// --- LỆNH TRUY VẤN LÊN MÁY CHỦ (DÒNG 144) ---
const btnApDung = document.getElementById("btnApDung");

btnApDung?.addEventListener("click", (e) => {
  if (window.L) L.DomEvent.stop(e);
  else {
    e.preventDefault?.();
    e.stopPropagation?.();
  }

  const chonLop = cboLopDuLieu.value;
  const chonTinhTrang = cboTinhTrang.value;
  const tuKhoaRaw = document.getElementById("txtTuKhoa").value.trim();
  const tuKhoa = tuKhoaRaw.replace(/'/g, "''");

  let cqlArray = [CQL_CONG_BO];
  const cauHinhDong = CAU_HINH_LOC_DONG[chonLop];

  if (chonTinhTrang !== "all" && cauHinhDong) {
    cqlArray.push(`${cauHinhDong.cotDB} = '${chonTinhTrang}'`);
  }

  if (tuKhoa !== "") {
    let col = "ten";
    if (chonLop === "angiang:khoangsan_diem_mo") col = "ten_don_vi";
    else if (chonLop === "angiang:dongvat" || chonLop === "angiang:thucvat")
      col = "ten_loai";

    // Dùng LIKE + strToLowerCase để an toàn tuyệt đối, không lo lỗi mạng
    cqlArray.push(`strToLowerCase(${col}) LIKE '%${tuKhoa.toLowerCase()}%'`);
  }

  const cqlString = `&CQL_FILTER=${encodeURIComponent(cqlArray.join(" AND "))}`;

  // CHUYỂN VỀ VERSION 1.0.0 ĐỂ ĐỒNG BỘ VỚI TÌM KIẾM
  const urlWFSQuery =
    `/myproxy/angiang/ows?service=WFS&version=1.0.0&request=GetFeature` +
    `&typeName=${chonLop}&outputFormat=application/json${cqlString}`;

  btnApDung.innerHTML = "⏳ ĐANG LẤY DỮ LIỆU...";

  fetch(urlWFSQuery)
    .then((res) => res.text())
    .then((text) => {
      btnApDung.innerHTML = "ÁP DỤNG LỌC DỮ LIỆU";
      if (text.startsWith("<") || text.includes("Exception")) {
        showToast(
          "Lớp dữ liệu này tạm thời không hỗ trợ truy vấn nhanh!",
          "error",
        );
        return;
      }
      const data = JSON.parse(text);
      HienThiKetQuaTruyVan(data.features, chonLop);
      bangTruyVan?.querySelector('.tab-btn[data-target="tabKetQua"]')?.click();
    })
    .catch((err) => {
      console.error(err);
      btnApDung.innerHTML = "ÁP DỤNG LỌC DỮ LIỆU";
      showToast("Lỗi kết nối máy chủ bản đồ!");
    });
});

// --- VẼ UI KẾT QUẢ VÀ XỬ LÝ CLICK (GIỐNG HỆT TÌM KIẾM) ---
function HienThiKetQuaTruyVan(features, lop) {
  const lstKetQua = document.getElementById("lstKetQua");
  document.getElementById("txtCount").innerText = features
    ? features.length
    : 0;
  lstKetQua.innerHTML = "";
  AppGIS.resultLayer.clearLayers();

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

    let div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
         <div class="res-item-container">
             <div class="res-icon-box">${icon}</div>
             <div class="res-info-body">
                 <h4 class="res-title">${ten}</h4>
                <span class="res-badge">${nhanLop}</span>
            </div>
        </div>
    `;

    let geojsonLayer = L.geoJSON(f);
    AppGIS.resultLayer.addLayer(geojsonLayer);

    // CLICK VÀO KẾT QUẢ: GIỐNG HỆT TÌM KIẾM
    div.addEventListener("click", () => {
      const bounds = geojsonLayer.getBounds();
      const tamDiem = bounds.getCenter();
      const meta = damBaoLopWmsDangBat(lop);
      const tieuDe = meta?.tieuDe || nhanLop || "Tài nguyên";

      AppGIS.map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });

      const block = taoPopupThongTin(f, tieuDe, lop, meta?.layerObj);
      L.popup().setLatLng(tamDiem).setContent(block).openOn(AppGIS.map);
    });

    lstKetQua.appendChild(div);
  });

  // Tự động thu phóng để thấy toàn bộ danh sách kết quả (Dòng 314 cũ)
  if (AppGIS.resultLayer.getLayers().length > 0) {
    AppGIS.map.flyToBounds(AppGIS.resultLayer.getBounds(), {
      padding: [50, 50],
      duration: 1.2,
    });
  }
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
    showToast("🔒 Bạn không có quyền Thêm dữ liệu.");
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
    showToast("🔒 Bạn không có quyền xem Thống kê.");
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
    showToast("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
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

  loader.classList.remove("hidden");
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
        Hệ thống đang lưu trữ tổng cộng <b class="text-red text-large">${total}</b> đối tượng thuộc lớp <b>${tenLop}</b>.<br><br>
        <i>Tiêu chí phân loại: ${keyPhanLoai.replace(/_/g, " ").toUpperCase()}.</i>
    `;

    loader.classList.add("hidden");
    container.classList.remove("hidden");
  } catch (err) {
    console.error("Lỗi thống kê:", err);
    loader.innerHTML =
      "<div class='text-red text-bold'>❌ Lỗi lấy dữ liệu từ GeoServer! Vui lòng bật Live Server.</div>";
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
    showToast("Chưa có dữ liệu để lập báo cáo!");
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
      showToast("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
      return;
    }

    kieuDoDat = this.getAttribute("data-type"); // distance | area
    cheDoVe = "measure";
    taiNguyenDangChon = "";
    document.getElementById("danhSachDoDat")?.classList.add("hidden");

    if (kieuDoDat === "distance") {
      new L.Draw.Polyline(AppGIS.map).enable();
      showToast(
        "📏 Chọn các điểm để đo khoảng cách (double click để kết thúc).",
      );
    } else {
      new L.Draw.Polygon(AppGIS.map).enable();
      showToast("📐 Vẽ vùng để đo diện tích (double click để kết thúc).");
    }
  });
});

document.getElementById("btnClearMeasure")?.addEventListener("click", () => {
  if (!hasPerm("feature.insert") && !hasPerm("admin.users")) {
    showToast("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
    return;
  }

  measureItems.clearLayers();
  AppGIS.map.closePopup();
  document.getElementById("danhSachDoDat")?.classList.add("hidden");
});
// ===============================
// MOBILE MENU (FIX): menu ☰ chạy được đủ chức năng
// - Thêm: hiện danh sách resource-item ngay trong menu
// - Thống kê: hiện danh sách stat-select-item
// - Đo đạc: hiện distance/area (measure-item)
// - Truy vấn: mở bangTruyVan
// - Layers: mở Leaflet layers
// ===============================
(function initMobileMenuFixed() {
  const btnOpen = document.getElementById("btnMobileMenu");

  const btnMobileSearch = document.getElementById("btnMobileSearch");
  const navbarSearchBox = document.querySelector(".navbar-search");

  btnMobileSearch?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!navbarSearchBox) return;
    navbarSearchBox.classList.toggle("is-open");
    if (navbarSearchBox.classList.contains("is-open")) {
      document.getElementById("inpSearch")?.focus();
    }
  });

  // Close search when tapping outside on mobile
  document.addEventListener("click", (e) => {
    if (!navbarSearchBox || !navbarSearchBox.classList.contains("is-open"))
      return;
    const t = e.target;
    if (t === btnMobileSearch) return;
    if (navbarSearchBox.contains(t)) return;
    navbarSearchBox.classList.remove("is-open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") navbarSearchBox?.classList.remove("is-open");
  });
  const overlay = document.getElementById("mobileMenuOverlay");
  const panel = overlay?.querySelector(".mobile-menu-panel");
  const mainList = overlay?.querySelector(".mobile-menu-list");
  const btnClose = document.getElementById("btnMobileMenuClose");
  const menuUser = document.getElementById("mobileMenuUser");

  if (!btnOpen || !overlay || !panel || !mainList) return;

  // tạo sub container nếu chưa có
  let sub = document.getElementById("mobileMenuSub");
  if (!sub) {
    sub = document.createElement("div");
    sub.id = "mobileMenuSub";
    sub.className = "mobile-menu-sub hidden";
    panel.appendChild(sub);
  }

  const authBtn = document.getElementById("mobileMenuAuth");
  const adminLink = document.getElementById("mobileMenuAdmin");

  function syncMenu() {
    const navUser = document.getElementById("navUser");
    const navAuth = document.getElementById("navAuth");
    const navAdmin = document.getElementById("navAdminUsers");

    const userText =
      navUser &&
      !navUser.classList.contains("hidden") &&
      navUser.textContent.trim()
        ? navUser.textContent.trim()
        : "👤 Khách";
    if (menuUser) menuUser.textContent = userText;

    if (authBtn && navAuth) authBtn.textContent = navAuth.textContent;

    if (adminLink && navAdmin) {
      adminLink.style.display = navAdmin.classList.contains("hidden")
        ? "none"
        : "";
    }
  }
  function applyMobileMenuPermissions() {
    const mmAdminUsers =
      document.getElementById("mmAdminUsers") ||
      document.getElementById("mobileMenuAdmin");
    const mmLayerManage = document.getElementById("mmLayerManage");
    const mmReport = document.getElementById("mmReport");

    // helper: show/hide
    const setShow = (el, ok) => {
      if (!el) return;
      if (ok) el.classList.remove("hidden");
      else el.classList.add("hidden");
    };

    // Quy ước quyền:
    // - Admin: roles includes "admin" OR perms includes "admin.users"
    const roles =
      typeof getRoles === "function"
        ? getRoles()
        : JSON.parse(localStorage.getItem("webgis_roles") || "[]") || [];
    const admin =
      Array.isArray(roles) &&
      roles.map((r) => (r || "").toLowerCase()).includes("admin"); // chỉ role admin mới coi là admin

    const staff =
      admin ||
      hasPerm("feature.insert") ||
      hasPerm("feature.update") ||
      hasPerm("feature.delete");

    // Bạn muốn cán bộ thấy gì?
    // Gợi ý:
    // - Quản lý tài khoản: CHỈ admin
    setShow(mmAdminUsers, admin);

    // - Quản lý lớp: thường chỉ admin (nếu muốn cán bộ thấy thì đổi staff)
    setShow(mmLayerManage, admin);

    // - Báo cáo: nếu có quyền riêng "report.view" thì cho, còn không admin mới thấy
    setShow(mmReport, admin || hasPerm("report.view"));
  }
  function openMenu() {
    syncMenu();
    applyMobileMenuPermissions(); // ✅ thêm dòng này
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    sub.classList.add("hidden");
    mainList.classList.remove("hidden");
  }

  function closeMenu() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  function showSubMenu(title, items) {
    // items: [{label, onClick}]
    sub.innerHTML = `
      <div class="mobile-sub-head">
        <button class="mobile-sub-back" type="button" id="mobileSubBack">←</button>
        <div class="mobile-sub-title">${title}</div>
      </div>
    `;

    items.forEach((it, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mobile-menu-item";
      b.textContent = it.label;
      b.addEventListener("click", () => {
        closeMenu();
        it.onClick?.();
      });
      sub.appendChild(b);
    });

    sub.querySelector("#mobileSubBack")?.addEventListener("click", () => {
      sub.classList.add("hidden");
      mainList.classList.remove("hidden");
    });

    mainList.classList.add("hidden");
    sub.classList.remove("hidden");
  }

  // === Action handlers (KHÔNG phụ thuộc toolbar-container hiển thị) ===
  function actionAdd() {
    if (!hasPerm("feature.insert") && !isAdmin()) {
      showToast("🔒 Bạn không có quyền thêm tài nguyên.");
      return;
    }

    const els = Array.from(
      document.querySelectorAll("#danhSachLoaiTaiNguyen .resource-item"),
    );
    if (!els.length) {
      showToast(
        "Không tìm thấy danh sách loại tài nguyên (#danhSachLoaiTaiNguyen).",
      );
      console.log("DEBUG add: missing #danhSachLoaiTaiNguyen .resource-item");
      return;
    }
    console.log(
      "DEBUG add: resource items =",
      els.map((x) => x.textContent.trim()),
    );

    showSubMenu(
      "➕ Thêm tài nguyên",
      els.map((el) => ({
        label: el.textContent.trim(),
        onClick: () => el.click(), // dùng handler có sẵn trong script.js
      })),
    );
  }

  function actionStats() {
    if (!hasPerm("stats.view") && !isAdmin()) {
      showToast("🔒 Bạn không có quyền xem thống kê.");
      return;
    }

    const els = Array.from(document.querySelectorAll(".stat-select-item"));
    if (!els.length) {
      showToast("Không tìm thấy danh sách thống kê (.stat-select-item).");
      return;
    }

    showSubMenu(
      "📊 Thống kê",
      els.map((el) => ({
        label: el.textContent.trim(),
        onClick: () => el.click(), // handler đã có: mở panelThongKe + gọi thống kê
      })),
    );
  }

  function actionMeasure() {
    if (!hasPerm("feature.insert") && !hasPerm("admin.users")) {
      showToast("🔒 Chức năng đo đạc chỉ dành cho cán bộ và admin.");
      return;
    }

    const dist = document.querySelector('.measure-item[data-type="distance"]');
    const area = document.querySelector('.measure-item[data-type="area"]');

    if (!dist || !area) {
      showToast("❌ Không tìm thấy nút đo đạc (.measure-item distance/area).");
      return;
    }

    showSubMenu("📏 Đo đạc", [
      { label: "📏 Đo khoảng cách", onClick: () => dist.click() },
      { label: "📐 Đo diện tích", onClick: () => area.click() },
      {
        label: "🧹 Xóa kết quả đo",
        onClick: () => document.getElementById("btnClearMeasure")?.click(),
      },
    ]);
  }

  function actionQuery() {
    const panelQuery = document.getElementById("bangTruyVan");
    if (!panelQuery) return showToast("Không tìm thấy #bangTruyVan");
    panelQuery.classList.remove("hidden");
  }

  function actionLayers() {
    document.querySelector(".leaflet-control-layers-toggle")?.click();
  }

  function openMobileSearch() {
    const box = document.querySelector(".navbar-search");
    if (box) box.classList.add("is-open");
    document.getElementById("inpSearch")?.focus();
  }
  function closeMobileSearch() {
    document.querySelector(".navbar-search")?.classList.remove("is-open");
  }
  function actionSearch() {
    const box = document.querySelector(".navbar-search");
    box?.classList.add("is-open"); // ✅ bật UI search trên mobile
    document.getElementById("inpSearch")?.focus();
  }

  // ==== bind main menu buttons ====
  btnOpen.addEventListener("click", (e) => {
    e.preventDefault();
    openMenu();
  });
  btnClose?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden"))
      closeMenu();
  });

  // buttons data-action (main view)
  mainList.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "add") return actionAdd();
      if (action === "stats") return actionStats();
      if (action === "measure") return actionMeasure();
      if (action === "query") {
        closeMenu();
        return actionQuery();
      }
      if (action === "layers") {
        closeMenu();
        return actionLayers();
      }
      if (action === "search") {
        closeMenu();
        return actionSearch();
      }

      // fallback
      closeMenu();
    });
  });

  // auth click (dùng navAuth logic có sẵn)
  authBtn?.addEventListener("click", () => {
    closeMenu();
    document.getElementById("navAuth")?.click();
  });

  // link click -> đóng menu
  overlay.querySelectorAll("a.mobile-menu-link").forEach((a) => {
    a.addEventListener("click", () => closeMenu());
  });
})();
AppGIS.map.on("popupclose", function () {
  if (AppGIS.resultLayer) {
    AppGIS.resultLayer.clearLayers();
  }
});
