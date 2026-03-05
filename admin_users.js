const api = apiJSON; // dùng từ common.js

function badgeStatus(status) {
  if (status === "hoat_dong")
    return `<span class="badge badge-ok">Hoạt động</span>`;
  if (status === "cho_duyet")
    return `<span class="badge badge-warn">Chờ duyệt</span>`;
  return `<span class="badge badge-off">Khóa</span>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;

  const helloUser = document.getElementById("helloUser");
  if (helloUser) {
    helloUser.textContent = `Xin chào, ${localStorage.getItem("webgis_user") || "Admin"}!`;
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = () => {
      clearAuth();
      window.location.href = "login.html";
    };
  }

  const btnReload = document.getElementById("btnReload");
  if (btnReload)
    btnReload.onclick = () => {
      state.page = 1;
      loadData();
    };

  await loadData();
});

let rolesMaster = [];

const state = {
  page: 1,
  limit: 10, // mỗi trang 10 user (đổi 20/50 tùy)
  total: 0,
};


async function loadData() {
  const msg = document.getElementById("msg");
  if (msg) {
    msg.className = "msg";
    msg.textContent = "";
  }

  try {
    rolesMaster = await api("/api/admin/roles");
    const usersAll = await api("/api/admin/users"); // vẫn lấy full

    state.total = usersAll.length;

    const totalUsers = document.getElementById("totalUsers");
    const pendingUsers = document.getElementById("pendingUsers");
    if (totalUsers) totalUsers.textContent = state.total;
    if (pendingUsers)
      pendingUsers.textContent = usersAll.filter(
        (u) => u.trang_thai === "cho_duyet",
      ).length;

    // cắt dữ liệu theo trang
    const start = (state.page - 1) * state.limit;
    const pageItems = usersAll.slice(start, start + state.limit);

    renderTable(pageItems);
    renderPager(document.getElementById("pager"), {
      page: state.page,
      total: state.total,
      limit: state.limit,
      onChange: (p) => {
        state.page = p;
        loadData();
      },
    });
  } catch (e) {
    if (msg) {
      msg.className = "msg show";
      msg.textContent = "❌ " + e.message;
    }
  }
}

function renderTable(users) {
  const tbody = document.getElementById("tbodyUsers");
  if (!tbody) return;
  tbody.innerHTML = "";

  users.forEach((u, idx) => {
    const roleValue = u.roles && u.roles.length ? u.roles[0] : "guest";

    const roleOptions = rolesMaster
      .map(
        (r) =>
          `<option value="${r.ma}" ${r.ma === roleValue ? "selected" : ""}>${r.ten}</option>`,
      )
      .join("");

    const statusOptions = `
      <option value="hoat_dong" ${u.trang_thai === "hoat_dong" ? "selected" : ""}>Hoạt động</option>
      <option value="cho_duyet" ${u.trang_thai === "cho_duyet" ? "selected" : ""}>Chờ duyệt</option>
      <option value="khoa" ${u.trang_thai === "khoa" ? "selected" : ""}>Khóa</option>
    `;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${(state.page - 1) * state.limit + idx + 1}</td>
      <td><b>${esc(u.ho_ten || "")}</b></td>
  <td>${esc(u.email || "")}</td>
      <td><select data-id="${u.id}" class="selRole">${roleOptions}</select></td>
      <td>
        <select data-id="${u.id}" class="selStatus">${statusOptions}</select>
        <div class="mt-6">${badgeStatus(u.trang_thai)}</div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-small btnSave" data-id="${u.id}">💾 Lưu</button>
          <button class="btn btn-small btn-danger btnDel" data-id="${u.id}">🗑 Xóa</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btnSave").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const role = tbody.querySelector(`.selRole[data-id="${id}"]`).value;
      const status = tbody.querySelector(`.selStatus[data-id="${id}"]`).value;

      btn.disabled = true;
      try {
        await api(`/api/admin/users/${id}/roles`, {
          method: "PUT",
          body: { roles: [role] },
        });
        await api(`/api/admin/users/${id}/status`, {
          method: "PATCH",
          body: { trang_thai: status },
        });
        await loadData();
        alert("✅ Đã lưu thay đổi!");
      } catch (e) {
        alert("❌ " + e.message);
      } finally {
        btn.disabled = false;
      }
    };
  });

  tbody.querySelectorAll(".btnDel").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      if (!confirm("Bạn chắc chắn muốn xóa tài khoản này?")) return;

      btn.disabled = true;
      try {
        await api(`/api/admin/users/${id}`, { method: "DELETE" });
        await loadData();
        alert("✅ Đã xóa!");
      } catch (e) {
        alert("❌ " + e.message);
      } finally {
        btn.disabled = false;
      }
    };
  });
}
