var reportData = null;
2;
// 1. Hàm dịch trạng thái
function dichTrangThai(val) {
  var statusMap = {
    nhap: "Bản nháp",
    cho_duyet: "Chờ duyệt",
    da_duyet: "Đã duyệt",
    cong_bo: "Đã công bố",
    cho_xoa: "Chờ xóa",
    da_xoa: "Đã xóa",
    tu_choi: "Từ chối",
  };
  var key = String(val).toLowerCase();
  return statusMap[key] || val;
}

// 2. Hàm bảo mật hiển thị (Chống XSS)
function escVal(s) {
  if (s === null || s === undefined) return "";
  var str = String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

document.addEventListener("DOMContentLoaded", function () {
  var raw = sessionStorage.getItem("webgis_report_data");
  var overlay = document.getElementById("loading-overlay");

  if (!raw) {
    if (overlay) overlay.style.display = "none";
    alert(
      "Không tìm thấy dữ liệu! Vui lòng thực hiện thống kê ở trang bản đồ trước.",
    );
    return;
  }

  // Chờ 100ms để đảm bảo giao diện đã sẵn sàng
  setTimeout(function () {
    try {
      reportData = JSON.parse(raw);
      if (reportData.features) {
        reportData.features = reportData.features.filter(function (f) {
          return f.properties.trang_thai_du_lieu === "cong_bo";
        });
      }
      renderReport(reportData);
    } catch (e) {
      console.error("Lỗi xử lý dữ liệu:", e);
      if (overlay) overlay.style.display = "none";
      alert("Dữ liệu báo cáo bị lỗi định dạng!");
    }
  }, 100);
});

function renderReport(data) {
  var overlay = document.getElementById("loading-overlay");
  var dict = data.dictionary || {};

  try {
    // Cập nhật thông tin text
    var elTenLop = document.getElementById("txtTenLop");
    if (elTenLop) elTenLop.innerText = data.layerName || "Không rõ";

    var elNgayLap = document.getElementById("txtNgayLap");
    if (elNgayLap)
      elNgayLap.innerText =
        "Ngày lập: " + (data.date || new Date().toLocaleDateString("vi-VN"));

    var tongSo =
      data.features && data.features.length ? data.features.length : 0;
    var elTongSo = document.getElementById("txtTongSo");
    if (elTongSo) elTongSo.innerText = tongSo;

    var thead = document.getElementById("theadReport");
    var tbody = document.getElementById("tbodyReport");

    if (!data.features || data.features.length === 0) {
      if (tbody)
        tbody.innerHTML =
          "<tr><td colspan='10' class='text-center'>Không có dữ liệu</td></tr>";
    } else {
      // Xác định các cột cần hiện (loại bỏ ID, geom, bbox...)
      var firstProps = data.features[0].properties || {};
      var keys = Object.keys(firstProps).filter(function (k) {
        // DANH SÁCH CÁC CỘT CẦN LOẠI BỎ (Thêm image_url vào đây)
        var ignored = [
          "bbox",
          "geom",
          "id",
          "fid",
          "objectid",
          "gid",
          "image_url",
          "ngay_tao",
          "nguoi_tao",
          "ngay_cap_nhat",
          "nguoi_cap_nhat",
          "ngay_phe_duyet",
          "nguoi_phe_duyet",
          "ngay_cong_bo",
          "nguoi_cong_bo",
          "ly_do",
        ];
        return ignored.indexOf(k) === -1;
      });

      // Render Tiêu đề bảng
      var headRow = "<tr><th style='width: 50px;'>STT</th>";
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var label = dict[k] || k;
        headRow += "<th>" + escVal(label) + "</th>";
      }
      if (thead) thead.innerHTML = headRow + "</tr>";

      // Render Nội dung bảng
      var bodyHtml = "";
      for (var j = 0; j < data.features.length; j++) {
        var feature = data.features[j];
        var rowHtml = "<tr><td class='text-center'>" + (j + 1) + "</td>";

        for (var k_idx = 0; k_idx < keys.length; k_idx++) {
          var key = keys[k_idx];
          var val = feature.properties[key];
          var displayVal =
            val !== null && val !== undefined && val !== "" ? val : "-";

          if (key === "trang_thai_du_lieu") {
            displayVal = dichTrangThai(val);
          }

          if (
            key.toLowerCase().indexOf("ngay") !== -1 &&
            val &&
            !isNaN(Date.parse(val))
          ) {
            displayVal = new Date(val).toLocaleDateString("vi-VN");
          }

          rowHtml += "<td>" + escVal(displayVal) + "</td>";
        }
        bodyHtml += rowHtml + "</tr>";
      }
      if (tbody) tbody.innerHTML = bodyHtml;
    }
  } catch (err) {
    console.error("Lỗi khi render báo cáo:", err);
  } finally {
    // Tắt hiệu ứng xoay tròn
    if (overlay) overlay.style.display = "none";
  }
}

// Nút In PDF
var btnPDF = document.getElementById("btnExportPDF");
if (btnPDF) {
  btnPDF.onclick = function () {
    window.print();
  };
}

// Nút Xuất Excel
var btnExcel = document.getElementById("btnExportExcel");
if (btnExcel) {
  btnExcel.onclick = function () {
    if (!reportData || !reportData.features) return;
    var dict = reportData.dictionary || {};

    var excelRows = reportData.features.map(function (feature, i) {
      var row = { STT: i + 1 };
      var props = feature.properties || {};
      for (var k in props) {
        var ignored = ["bbox", "geom", "id", "fid", "objectid", "gid"];
        if (ignored.indexOf(k) === -1) {
          var headerName = dict[k] || k;
          var val = props[k];
          if (k === "trang_thai_du_lieu") {
            val = dichTrangThai(val);
          }
          row[headerName] = val;
        }
      }
      return row;
    });

    var worksheet = XLSX.utils.json_to_sheet(excelRows);
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Báo Cáo GIS");
    var safeLayerName = (reportData.layerName || "GIS").replace(/\s+/g, "_");
    XLSX.writeFile(workbook, "Bao_Cao_" + safeLayerName + ".xlsx");
  };
}
