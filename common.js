window.WEBGIS_API_BASE = window.WEBGIS_API_BASE || "";

const WEBGIS_STORAGE_KEYS = [
  "webgis_token",
  "webgis_roles",
  "webgis_permissions",
  "webgis_perms",
  "webgis_role",
  "webgis_user",
];

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function getToken() {
  return localStorage.getItem("webgis_token") || "";
}

function clearAuth() {
  WEBGIS_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}
function requireLogin(redirect = "login.html") {
  if (!getToken()) {
    window.location.href = redirect;
    return false;
  }
  return true;
}

function requireAdmin(redirect = "index.html") {
  if (!requireLogin()) return false;
  if (!isAdmin()) {
    window.location.href = redirect;
    return false;
  }
  return true;
}
function getRoles() {
  return (readJSON("webgis_roles", []) || []).map((x) =>
    String(x).toLowerCase(),
  );
}

function getPerms() {
  const p =
    readJSON("webgis_permissions", null) ?? readJSON("webgis_perms", []);
  return (p || []).map((x) => String(x).toLowerCase());
}

function hasPerm(perm) {
  if (!getToken()) return false;
  const p = String(perm || "").toLowerCase();
  return getPerms().includes(p);
}

function isAdmin() {
  const roles = getRoles();
  const perms = getPerms();
  return roles.includes("admin") || perms.includes("admin.users");
}

function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1] || "";
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    const sub = payload?.sub;
    return Number.isFinite(Number(sub)) ? Number(sub) : null;
  } catch {
    return null;
  }
}

async function apiJSON(path, opts = {}) {
  const base = window.WEBGIS_API_BASE || ""; // ✅ không còn localhost
  const token = getToken();

  const headers = { ...(opts.headers || {}) };

  // auto JSON body
  if (
    opts.body &&
    typeof opts.body === "object" &&
    !(opts.body instanceof FormData)
  ) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    opts = { ...opts, body: JSON.stringify(opts.body) };
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(base + path, { ...opts, headers });
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      window.location.href = "login.html";
      return;
    }
    const msg = data && data.message ? data.message : text || "API error";
    throw new Error(msg);
  }
  return data;
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function fmt(dt) {
  if (!dt) return "";

  // dt thường là ISO có Z -> nếu dùng toLocaleString sẽ tự +7
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";

  const isZ = typeof dt === "string" && /Z$/.test(dt);

  const hh = String(isZ ? d.getUTCHours() : d.getHours()).padStart(2, "0");
  const mm = String(isZ ? d.getUTCMinutes() : d.getMinutes()).padStart(2, "0");
  const ss = String(isZ ? d.getUTCSeconds() : d.getSeconds()).padStart(2, "0");

  const day = isZ ? d.getUTCDate() : d.getDate();
  const mon = (isZ ? d.getUTCMonth() : d.getMonth()) + 1;
  const yr = isZ ? d.getUTCFullYear() : d.getFullYear();

  // format giống bạn đang hiển thị: HH:mm:ss d/m/yyyy
  return `${hh}:${mm}:${ss} ${day}/${mon}/${yr}`;
}
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Dùng cho index.html (nếu có navAuth/navUser/navAdminUsers)
function initAuthNav() {
  const navAuth = document.getElementById("navAuth");
  const navUser = document.getElementById("navUser");
  const navAdmin = document.getElementById("navAdminUsers");
  if (!navAuth) return;

  const logged = !!getToken();

  if (navUser) {
    if (logged) {
      navUser.classList.remove("hidden");
      navUser.textContent = `👤 ${localStorage.getItem("webgis_user") || "User"}`;
    } else {
      navUser.classList.add("hidden");
      navUser.textContent = "";
    }
  }

  if (navAdmin) navAdmin.classList.toggle("hidden", !(logged && isAdmin()));

  if (logged) {
    navAuth.textContent = "Đăng xuất";
    navAuth.href = "#";
    navAuth.onclick = (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    };
  } else {
    navAuth.textContent = "Đăng nhập";
    navAuth.href = "login.html";
    navAuth.onclick = null;
  }
}

// Dùng cho index.html (ẩn/hiện theo data-perm)
function applyPermUI() {
  document.querySelectorAll("[data-perm]").forEach((el) => {
    const p = el.getAttribute("data-perm");
    el.style.display = hasPerm(p) ? "" : "none";
  });

  if (!hasPerm("feature.insert")) {
    document.getElementById("danhSachTaiNguyen")?.classList.add("hidden");
  }
  if (!hasPerm("stats.view")) {
    document.getElementById("danhSachThongKe")?.classList.add("hidden");
    document.getElementById("panelThongKe")?.classList.add("hidden");
  }
}
// ===== Password toggle: áp dụng cho mọi input password (global) =====
(function initTogglePasswordGlobal() {
  const ICON_SHOW = "images/openmk.jpg";
  const ICON_HIDE = "images/closemk.jpg";

  // 1) Tự chèn nút cho mọi input password
  document.querySelectorAll('input[type="password"]').forEach((input, idx) => {
    if (!input.id) input.id = `pwd_${idx}_${Date.now()}`;

    // tránh chèn lặp
    if (
      input.parentElement?.querySelector(
        `.toggle-pass[data-target="${input.id}"]`,
      )
    )
      return;

    // add class để CSS position icon
    input.parentElement?.classList?.add("pwd-wrap");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toggle-pass";
    btn.dataset.target = input.id;
    btn.setAttribute("aria-label", "Hiện mật khẩu");
    btn.setAttribute("aria-pressed", "false");

    const img = document.createElement("img");
    img.className = "toggle-pass-ico";
    img.src = ICON_HIDE;
    img.alt = "";
    btn.appendChild(img);

    input.parentElement?.appendChild(btn);
  });

  // 2) Bắt click bằng event delegation (đỡ phải addEventListener từng nút)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".toggle-pass");
    if (!btn) return;

    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    const img = btn.querySelector(".toggle-pass-ico");
    const willShow = input.type === "password";

    input.type = willShow ? "text" : "password";
    if (img) img.src = willShow ? ICON_SHOW : ICON_HIDE;

    btn.setAttribute("aria-pressed", String(willShow));
    btn.setAttribute("aria-label", willShow ? "Ẩn mật khẩu" : "Hiện mật khẩu");
  });
})();

// ===== Pagination/Pager dùng chung (admin pages) =====
function buildPageList(totalPages, current, maxPages = 100, radius = 2) {
  totalPages = Math.max(1, Number(totalPages || 1));
  current = Math.min(Math.max(1, Number(current || 1)), totalPages);

  // ít trang -> liệt kê hết
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // nhiều trang -> 1 ... (current±radius) ... last
  const pages = new Set([1, totalPages, current]);
  for (let i = 1; i <= radius; i++) {
    pages.add(current - i);
    pages.add(current + i);
  }

  const arr = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("...");
  }
  return out;
}

function renderPager(
  pagerEl,
  {
    page = 1,
    total = 0,
    limit = 10,
    onChange,
    maxPages = 100,
    radius = 2,
  } = {},
) {
  if (!pagerEl) return;

  const totalPages = Math.max(
    1,
    Math.ceil(Number(total || 0) / Number(limit || 1)),
  );
  page = Math.min(Math.max(1, Number(page || 1)), totalPages);

  if (totalPages <= 1) {
    pagerEl.innerHTML = "";
    return;
  }

  const pages = buildPageList(totalPages, page, maxPages, radius);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  pagerEl.innerHTML = `
    <button ${prevDisabled ? "disabled" : ""} data-page="${page - 1}">‹</button>
    ${pages
      .map((p) =>
        p === "..."
          ? `<span class="dots">…</span>`
          : `<button class="${p === page ? "active" : ""}" data-page="${p}">${p}</button>`,
      )
      .join("")}
    <button ${nextDisabled ? "disabled" : ""} data-page="${page + 1}">›</button>
  `;

  pagerEl.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.onclick = () => {
      const p = Number(btn.getAttribute("data-page"));
      const safe = Math.min(Math.max(1, p), totalPages);
      if (typeof onChange === "function") onChange(safe, totalPages);
    };
  });
}
