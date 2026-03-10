const api = apiJSON;
const state = {
  page: 1,
  limit: 50, // Số bản ghi mỗi trang
  total: 0,
};
function statusBadge(st) {
  const s = String(st || "").toLowerCase();
  const map = {
    nhap: "Nhập",
    cho_duyet: "Chờ duyệt",
    da_duyet: "Đã duyệt",
    cong_bo: "Công bố",
    tu_choi: "Từ chối",
  };
  const label = map[s] || st || "-";
  return `<span class="badge">${esc(label)}</span>`;
}

function stepCell(time, who, emptyText) {
  if (!time) return `<div class="muted">${esc(emptyText)}</div>`;
  return `
    <div class="step">
      <div class="step-time">${esc(fmt(time))}</div>
      <div class="step-who">${esc(who || "-")}</div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;

  const helloUser = document.getElementById("helloUser");
  if (helloUser) {
    helloUser.textContent = `Xin chào, ${
      localStorage.getItem("webgis_user") || "Admin"
    }!`;
  }

  document.getElementById("btnLogout")?.addEventListener("click", () => {
    clearAuth();
    window.location.href = "login.html";
  });

  document.getElementById("btnReload")?.addEventListener("click", load);
  document.getElementById("q")?.addEventListener("input", debounce(load, 250));

  // Thêm dòng này để khi chọn lớp khác thì danh sách tự tải lại
  document.getElementById("cboLayer")?.addEventListener("change", load);

  await load();
});

async function load() {
  const tbody = document.getElementById("tbody");
  const msg = document.getElementById("msg");

  if (msg) {
    msg.className = "msg";
    msg.textContent = "";
  }
  tbody.innerHTML = "";

  try {
    const q = (document.getElementById("q")?.value || "").trim();
    const layerChon =
      document.getElementById("cboLayer")?.value || "angiang:rung";

    // Lấy toàn bộ dữ liệu (hoặc tăng limit lên cao)
    const allRows = await api(
      `/api/admin/resource-history?layer=${layerChon}&limit=1000&q=${encodeURIComponent(q)}`,
    );

    state.total = allRows.length;

    // Cắt dữ liệu theo trang
    const start = (state.page - 1) * state.limit;
    const pageItems = allRows.slice(start, start + state.limit);

    pageItems.forEach((r, idx) => {
      const stt = start + idx + 1; // STT chạy đúng theo trang
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td class="text-center">${stt}</td>
           <td><b>${esc(r.ten_tai_nguyen || "-")}</b><div class="muted">${esc(r.ma_lop || "")}</div></td>
        <td>${statusBadge(r.trang_thai_du_lieu)}</td>
        <td>${stepCell(r.ngay_tao, r.ten_nguoi_tao || r.nguoi_tao, "Chưa có")}</td>
        <td>${stepCell(r.ngay_cap_nhat, r.ten_nguoi_cap_nhat || r.nguoi_cap_nhat || "-", "Chưa cập nhật")}</td>
        <td>${
          String(r.trang_thai_du_lieu).toLowerCase() === "tu_choi" &&
          r.ly_do_tu_choi
            ? `<div class="muted">Lý do: ${esc(r.ly_do_tu_choi)}</div>`
            : ""
        }
        ${stepCell(r.ngay_phe_duyet, r.ten_nguoi_phe_duyet || r.nguoi_phe_duyet, "Chưa duyệt")}</td>
        <td>${stepCell(r.ngay_cong_bo, r.ten_nguoi_cong_bo || r.nguoi_cong_bo, "Chưa công bố")}</td>
      `;
      tbody.appendChild(tr);
    });
    renderPager(document.getElementById("pager"), {
      page: state.page,
      total: state.total,
      limit: state.limit,
      onChange: (p) => {
        state.page = p;
        load(); // Tải lại trang mới
      },
    });
    if (!allRows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Chưa có dữ liệu lịch sử cập nhật</td></tr>`;
    }
  } catch (e) {
    if (msg) {
      msg.className = "msg show";
      msg.textContent = "❌ " + e.message;
    }
  }
}
