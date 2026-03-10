const api = apiJSON;
const statusLabel = {
  nhap: "Nhập",
  cho_duyet: "Chờ duyệt",
  cong_bo: "Công bố (Hiện bản đồ)",
  da_xoa: "Đã xóa",
};

const state = { page: 1, limit: 50, total: 0 };

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;

  const helloUser = document.getElementById("helloUser");
  if (helloUser)
    helloUser.textContent = `Xin chào, ${localStorage.getItem("webgis_user") || "Admin"}!`;

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = () => {
      clearAuth();
      location.href = "login.html";
    };
  }

  const btnReload = document.getElementById("btnReload");
  if (btnReload) {
    btnReload.onclick = () => {
      state.page = 1;
      load();
    };
  }

  const btnTrash = document.getElementById("btnTrash");
  if (btnTrash) {
    btnTrash.onclick = () => {
      const statusFilter = document.getElementById("statusFilter");
      if (statusFilter.value === "da_xoa") {
        statusFilter.value = "tat_ca";
        btnTrash.classList.remove("btn-trash-active");
        btnTrash.innerHTML = "🗑️ Thùng rác";
      } else {
        statusFilter.value = "da_xoa";
        btnTrash.classList.add("btn-trash-active");
        btnTrash.innerHTML = "📂 Đóng Thùng rác";
      }
      state.page = 1;
      load();
    };
  }

  const inpSearch = document.getElementById("q");
  if (inpSearch) {
    inpSearch.addEventListener(
      "input",
      debounce(() => {
        state.page = 1;
        load();
      }, 250),
    );
  }

  const layerSelect = document.getElementById("layerSelect");
  if (layerSelect) {
    layerSelect.addEventListener("change", () => {
      state.page = 1;
      load();
    });
  }

  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      state.page = 1;
      load();
    });
  }

  await loadLayers();
  await load();
});

async function loadLayers() {
  const sel = document.getElementById("layerSelect");
  if (!sel) return;
  sel.innerHTML = `<option>Đang tải...</option>`;
  try {
    const layers = await api("/api/admin/layers");
    sel.innerHTML = layers
      .map(
        (x) =>
          `<option value="${esc(x.layer)}">${esc(x.label || x.layer)}</option>`,
      )
      .join("");
  } catch (e) {
    sel.innerHTML = `<option>Lỗi tải lớp</option>`;
  }
}

async function load() {
  const tbody = document.getElementById("tbody");
  const msg = document.getElementById("msg");
  if (!tbody || !msg) return;

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
  const layerSelect = document.getElementById("layerSelect");
  const statusFilter = document.getElementById("statusFilter");
  const qInput = document.getElementById("q");

  if (!layerSelect || !statusFilter || !qInput) return;

  const layer = layerSelect.value;
  const status = statusFilter.value;
  const q = qInput.value.trim();

  const url = `/api/admin/layer-objects?layer=${encodeURIComponent(layer)}&status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`;

  const data = await api(url);
  state.total = data.length;

  const start = (state.page - 1) * state.limit;
  const pageItems = data.slice(start, start + state.limit);

  renderTable(pageItems, layer);

  const pagerDiv = document.getElementById("pager");
  if (pagerDiv) {
    renderPager(pagerDiv, {
      page: state.page,
      total: state.total,
      limit: state.limit,
      onChange: (p) => {
        state.page = p;
        loadObjects();
      },
    });
  }
}

function renderTable(items, layerName) {
  const tbody = document.getElementById("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted text-center">Không có dữ liệu</td></tr>`;
    return;
  }

  // Lấy trạng thái lọc hiện tại để biết đang ở Thùng rác hay danh sách thường
  const isTrash = document.getElementById("statusFilter")?.value === "da_xoa";

  items.forEach((it, idx) => {
    const tr = document.createElement("tr");
    const isChoXoa = it.trang_thai_du_lieu === "cho_xoa";
    const isChoDuyet = it.trang_thai_du_lieu === "cho_duyet";
    const stt = (state.page - 1) * state.limit + idx + 1;
    const objId = it.gid || it.id || it.fid || it.objectid;

    // 1. Xác định class cho hàng đang chờ duyệt
    const cellClass = isChoDuyet ? "row-pending" : "";

    // 2. Tạo logic cho cột TRẠNG THÁI (Select box)
    const statusOptions = Object.keys(statusLabel)
      .map(
        (k) =>
          `<option value="${k}" ${it.trang_thai_du_lieu === k ? "selected" : ""}>${statusLabel[k]}</option>`,
      )
      .join("");

    // 3. Tạo logic cho cột HÀNH ĐỘNG
    let actionButtons = "";
    if (isTrash) {
      // Nếu trong thùng rác: Hiện nút Khôi phục và Xóa vĩnh viễn
      actionButtons = `
            <button class="btn btn-small btn-success" onclick="adminKhoiPhucTuThungRac('${layerName}', '${objId}')">🔄 Khôi phục</button>   
            <button class="btn btn-small btn-danger" onclick="adminXoaVinhVienTuThungRac('${layerName}', '${objId}')">💀 Xóa vĩnh
      viễn</button>
          `;
    } else if (isChoXoa) {
      // Nếu có yêu cầu xóa: Hiện nút Duyệt xóa và Từ chối
      actionButtons = `
            <button class="btn btn-small btn-danger" onclick="adminPheDuyetXoa('${layerName}', '${objId}')">✅ Duyệt xóa</button>
            <button class="btn btn-small btn-ghost" onclick="adminTuChoiXoa('${layerName}', '${objId}')">❌ Từ chối</button>
          `;
    } else {
      // Danh sách bình thường: Hiện nút Lưu trạng thái và Xóa (vào thùng rác)
      actionButtons = `
            <button class="btn btn-small" data-save="${objId}">💾 Lưu</button>
            <button class="btn btn-small btn-ghost" onclick="adminPheDuyetXoa('${layerName}', '${objId}')">🗑️ Xóa</button>
          `;
    }

    tr.innerHTML = `
          <td class="text-center">${stt}</td>
          <td class="text-center">${objId}</td>
          <td class="${cellClass}">
              <b>${it.ten || "Không tên"}</b>
              ${isChoXoa ? `<div class="status-label-sub status-red">Yêu cầu xóa</div>` : ""}
              ${isChoDuyet ? `<div class="status-label-sub status-orange">Chờ duyệt</div>` : ""}
          </td>
          <td>
              ${
                isChoXoa
                  ? `<div class="reason-alert-box"><strong>Lý do: ${it.ly_do || "Không có lý do"}</strong></div>`
                  : `<select class="input" data-id="${objId}">${statusOptions}</select>`
              }
          </td>
          <td class="muted">${fmt(it.ngay_cap_nhat || it.ngay_tao)}</td>
          <td>
              <div class="row-actions">${actionButtons}</div>
          </td>
        `;
    tbody.appendChild(tr);
  });

  // Gán sự kiện cho nút Lưu sau khi render
  tbody.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-save");
      const sel = tbody.querySelector(`select[data-id="${id}"]`);
      if (!sel) return;
      const stage = sel.value;
      btn.disabled = true;
      try {
        await api("/api/admin/layer-objects/stage", {
          method: "PATCH",
          body: { layer: layerName, ids: [id], stage },
        });
        showToast("Cập nhật trạng thái thành công!");
        loadObjects();
      } catch (e) {
        showToast("Lỗi: " + e.message, "error");
      } finally {
        btn.disabled = false;
      }
    };
  });
}

window.adminPheDuyetXoa = async (layer, id) => {
  if (
    confirm(
      "Xác nhận XÓA tài nguyên này? (Bạn vẫn có thể khôi phục từ Thùng rác)",
    )
  ) {
    try {
      await api("/api/admin/layer-objects/stage", {
        method: "PATCH",
        body: {
          layer: layer,
          ids: [id],
          stage: "da_xoa",
          reason: "Admin xác nhận xóa",
        },
      });
      showToast("Đã chuyển vào Thùng rác.");
      load();
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  }
};

window.adminTuChoiXoa = async (layer, id) => {
  if (confirm("Khôi phục tài nguyên này về trạng thái 'Công bộ'?")) {
    try {
      await api("/api/admin/layer-objects/stage", {
        method: "PATCH",
        body: {
          layer,
          ids: [id],
          stage: "cong_bo",
          reason: "Admin từ chối yêu cầu xóa",
        },
      });
      showToast("Đã khôi phục tài nguyên.");
      load();
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  }
};

window.adminKhoiPhucTuThungRac = async (layer, id) => {
  if (
    confirm("Bạn có chắc chắn muốn KHÔI PHỤC tài nguyên này quay lại bản đồ?")
  ) {
    try {
      await api("/api/admin/layer-objects/stage", {
        method: "PATCH",
        body: {
          layer,
          ids: [id],
          stage: "cong_bo",
          reason: "Khôi phục từ thùng rác",
        },
      });
      showToast("Đã khôi phục tài nguyên!");
      load();
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  }
};
window.adminXoaVinhVienTuThungRac = async (layer, id) => {
  const confirm1 = confirm(
    "CẢNH BÁO TỐI CAO: Hành động này sẽ xóa VĨNH VIỄN tài nguyên khỏi hệ thống và không thể khôi phục lại được.",
  );
  if (!confirm1) return;

  const confirm2 = confirm(
    "Bạn có chắc chắn 100% muốn thực hiện việc này không?",
  );
  if (!confirm2) return;

  // THAY ĐỔI: Tách lấy tên bảng chuẩn để tạo FeatureId (Fid)
  const tableName = layer.includes(":") ? layer.split(":")[1] : layer;
  const fid = `${tableName}.${id}`;

  const xml = `
                <wfs:Transaction service="WFS" version="1.0.0"
                    xmlns:wfs="http://www.opengis.net/wfs"
                    xmlns:ogc="http://www.opengis.net/ogc">
                    <wfs:Delete typeName="${layer}">
                        <ogc:Filter>
                            <ogc:FeatureId fid="${fid}"/>
                        </ogc:Filter>
                    </wfs:Delete>
                </wfs:Transaction>`;

  try {
    await api("/api/wfst", {
      method: "POST",
      headers: {
        "X-Action": "delete",
        "X-Layer": layer,
        "Content-Type": "application/xml",
      },
      body: xml,
    });

    showToast("✅ Đã xóa vĩnh viễn tài nguyên khỏi hệ thống.");
    load();
  } catch (e) {
    showToast("❌ Lỗi xóa vĩnh viễn: " + e.message, "error");
  }
};
