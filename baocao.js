let reportData = null;

window.onload = function () {
  // Lấy dữ liệu từ sessionStorage do trang Bản đồ gửi sang
  const raw = sessionStorage.getItem("webgis_report_data");
  if (!raw) {
    alert(
      "Không tìm thấy dữ liệu! Vui lòng thực hiện thống kê ở trang bản đồ trước.",
    );
    window.close();
    return;
  }

  // Dùng setTimeout để giao diện Loading hiện lên trước khi JavaScript "đóng băng" trình duyệt để vẽ bảng lớn
  setTimeout(() => {
    reportData = JSON.parse(raw);
    renderReport(reportData);
  }, 100);
};

function renderReport(data) {
  const dict = (data && typeof data.dictionary === "object" && data.dictionary) ? data.dictionary : {};
  document.getElementById("txtTenLop").innerText = data.layerName;
  document.getElementById("txtNgayLap").innerText = "Ngày lập: " + data.date;
  document.getElementById("txtTongSo").innerText =
    data.features.length + " đối tượng";

  const thead = document.getElementById("theadReport");
  const tbody = document.getElementById("tbodyReport");

  if (data.features.length === 0) return;

  // 1. Tạo tiêu đề cột
  const firstProps = data.features[0].properties;
  const keys = Object.keys(firstProps).filter(
    (k) => !["bbox", "geom", "id"].includes(k),
  );

  let headRow = "<tr><th>STT</th>";
  keys.forEach((k) => {
    const tenTiengViet = dict[k] || k;
    headRow += `<th>${esc(tenTiengViet)}</th>`;
  });
  thead.innerHTML = headRow + "</tr>";

  // 2. Đổ dữ liệu (Gom thành 1 chuỗi HTML lớn để Render cực nhanh)
  let bodyHtml = "";
  data.features.forEach((f, index) => {
    let rowHtml = `<tr><td style="text-align:center;">${index + 1}</td>`;
    keys.forEach((k) => {
      const value =
        f.properties[k] !== null && f.properties[k] !== ""
          ? f.properties[k]
          : "-";
      rowHtml += `<td>${esc(value)}</td>`;
    });
    bodyHtml += rowHtml + "</tr>";
  });
  tbody.innerHTML = bodyHtml;

  // Tắt màn hình chờ
  document.getElementById("loading-overlay").style.display = "none";
}

// Lệnh In
document.getElementById("btnExportPDF").onclick = () => window.print();

// Lệnh xuất Excel bằng SheetJS
document.getElementById("btnExportExcel").onclick = () => {
  if (!reportData) return;

  const excelRows = reportData.features.map((f, i) => {
    let row = { STT: i + 1 };
    for (let k in f.properties) {
      if (!["bbox", "geom", "id"].includes(k)) {
        const headerName = TU_DIEN_COT[k] || k;
        row[headerName] = f.properties[k];
      }
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Báo Cáo GIS");

  const fileName = `Bao_Cao_${reportData.layerName.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};