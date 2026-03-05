const api = apiJSON;

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

    // ✅ API mới: lịch sử cập nhật tài nguyên
    const rows = await api(
      `/api/admin/resource-history?limit=300&q=${encodeURIComponent(q)}`,
    );

    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td><b>${esc(r.ten_tai_nguyen || "-")}</b><div class="muted">${esc(r.ma_lop || "")}</div></td>
        <td>${statusBadge(r.trang_thai_du_lieu)}</td>
        <td>${stepCell(r.ngay_tao, r.ten_nguoi_tao || r.nguoi_tao, "Chưa có")}</td>
        <td>${stepCell(r.ngay_cap_nhat, r.ten_nguoi_cap_nhat || r.nguoi_cap_nhat, "Chưa cập nhật")}</td>
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

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Chưa có dữ liệu lịch sử cập nhật</td></tr>`;
    }
  } catch (e) {
    if (msg) {
      msg.className = "msg show";
      msg.textContent = "❌ " + e.message;
    }
  }
}
