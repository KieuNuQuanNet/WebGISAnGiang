const api = apiJSON; // dùng từ common.js
const statusLabel = {
  nhap: "Nhập",
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  cong_bo: "Công bố",
  tu_choi: "Từ chối",
};

const state = { page: 1, limit: 50, total: 0 };

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;

  document.getElementById("helloUser").textContent =
    `Xin chào, ${localStorage.getItem("webgis_user") || "Admin"}!`;
  document.getElementById("btnLogout").onclick = () => {
    clearAuth();
    location.href = "login.html";
  };

  document.getElementById("btnReload").onclick = () => {
    state.page = 1;
    load();
  };
  document.getElementById("q").addEventListener(
    "input",
    debounce(() => {
      state.page = 1;
      load();
    }, 250),
  );
  document.getElementById("layerSelect").addEventListener("change", () => {
    state.page = 1;
    load();
  });
  document.getElementById("statusFilter").addEventListener("change", () => {
    state.page = 1;
    load();
  });

  await loadLayers();
  await load();
});

async function loadLayers() {
  const sel = document.getElementById("layerSelect");
  sel.innerHTML = `<option>Đang tải...</option>`;
  const layers = await api("/api/admin/layers");

  sel.innerHTML = layers
    .map((x) => {
      const text = x.label || x.layer; // ✅ hiển thị đẹp
      return `<option value="${esc(x.layer)}">${esc(text)}</option>`;
    })
    .join("");
}

// layer-manage.js (sau) — thay toàn bộ hàm load()

async function load() {
  const tbody = document.getElementById("tbody");
  const msg = document.getElementById("msg");

  msg.className = "msg";
  msg.textContent = "";
  tbody.innerHTML = "";

  try {
    await loadObjects();
  } catch (e) {
    msg.className = "msg show";
    msg.textContent = "❌ " + e.message;
  }
}

async function loadObjects() {
  const layer = document.getElementById("layerSelect").value;
  const status = document.getElementById("statusFilter").value;
  const q = (document.getElementById("q").value || "").trim();

  const url =
    `/api/admin/layer-objects?layer=${encodeURIComponent(layer)}` +
    `&status=${encodeURIComponent(status)}` +
    `&q=${encodeURIComponent(q)}` +
    `&limit=${state.limit}&page=${state.page}`;

  const data = await api(url);
  state.total = Number(data.total || 0);

  renderTable(data.items || [], layer);

  renderPager(document.getElementById("pager"), {
    page: state.page,
    total: state.total,
    limit: state.limit,
    onChange: (p) => {
      state.page = p;
      loadObjects();
    },
  });
}

function renderTable(items, layerName) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  const startIndex = (state.page - 1) * state.limit;

  items.forEach((it, idx) => {
    const stt = startIndex + idx + 1;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="text-center">${stt}</td>
      <td>${it.id}</td>
      <td>
        <b>${esc(it.ten || "(không có tên)")}</b>
        <div class="muted">${esc(layerName)}</div>
      </td>
      <td>
        <select class="input" data-id="${it.id}">
          ${Object.keys(statusLabel)
            .map(
              (s) =>
                `<option value="${s}" ${
                  String(it.trang_thai_du_lieu) === s ? "selected" : ""
                }>${statusLabel[s]}</option>`,
            )
            .join("")}
        </select>
        ${
          it.trang_thai_du_lieu === "tu_choi" && it.ly_do_tu_choi
            ? `<div class="warn-text">Lý do: ${esc(it.ly_do_tu_choi)}</div>`
            : ""
        }
      </td>
      <td>${esc(fmt(it.ngay_cong_bo || it.ngay_phe_duyet || it.ngay_cap_nhat || it.ngay_tao))}</td>
      <td><button class="btn" data-save="${it.id}">Lưu</button></td>
    `;
    tbody.appendChild(tr);
  });

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Không có dữ liệu</td></tr>`;
    return;
  }

  // bind save SAU KHI render
  tbody.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute("data-save"));
      const sel = tbody.querySelector(`select[data-id="${id}"]`);
      const stage = sel.value;

      let reason = null;
      if (stage === "tu_choi") {
        reason = prompt("Nhập lý do từ chối:", "") || "";
      }

      await api("/api/admin/layer-objects/stage", {
        method: "PATCH",
        body: { layer: layerName, ids: [id], stage, reason },
      });

      await loadObjects(); // reload trang hiện tại
    };
  });
}
