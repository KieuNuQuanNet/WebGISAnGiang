const API_BASE = window.WEBGIS_API_BASE || "";

const secLogin = document.getElementById("sectionLogin");
const secRegister = document.getElementById("sectionRegister");
const btnToRegister = document.getElementById("btnToRegister");
const btnToLogin = document.getElementById("btnToLogin");

const frmLogin = document.getElementById("frmLogin");
const frmRegister = document.getElementById("frmRegister");

const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const errorRegMsg = document.getElementById("errorRegMsg");

function show(el, msg) {
  if (!el) return;
  el.style.display = "block";
  if (typeof msg === "string") el.innerHTML = msg;
}
function hide(el) {
  if (!el) return;
  el.style.display = "none";
}

function gotoRegister() {
  setActiveSection(secRegister);
  hide(errorMsg);
  hide(successMsg);
  hide(errorRegMsg);
}

function gotoLogin() {
  setActiveSection(secLogin);
  hide(errorMsg);
  hide(successMsg);
  hide(errorRegMsg);
}

const qs = new URLSearchParams(window.location.search);
const verifyToken = qs.get("verify");
const resetToken = qs.get("reset"); // ✅ thêm

// Nếu đang verify/reset thì KHÔNG redirect vội
if (!verifyToken && !resetToken && localStorage.getItem("webgis_token")) {
  window.location.href = "index.html";
}

// ===== EMAIL VERIFY (khi user bấm link trong email) =====
(async function handleVerify() {
  if (!verifyToken) return;

  try {
    const r = await fetch(
      `${API_BASE}/api/xac-nhan-email?token=${encodeURIComponent(verifyToken)}`,
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || "Xác nhận email thất bại");

    show(successMsg, "✅ " + (data.message || "Xác nhận email thành công!"));
    gotoLogin();
  } catch (e) {
    show(errorMsg, "❌ " + (e.message || e));
    gotoLogin();
  } finally {
    // xóa ?verify=... khỏi URL
    window.history.replaceState({}, "", "login.html");
  }
})();

// Toggle
btnToRegister?.addEventListener("click", (e) => {
  e.preventDefault?.();
  gotoRegister();
});

btnToLogin?.addEventListener("click", (e) => {
  e.preventDefault?.();
  gotoLogin();
});

// REGISTER
frmRegister?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hide(successMsg);
  hide(errorRegMsg);

  const ho_ten = document.getElementById("regName")?.value.trim() || "";
  const email = document.getElementById("regEmail")?.value.trim() || "";
  const mat_khau = document.getElementById("regPass")?.value || "";
  const mat_khau2 = document.getElementById("regPassConfirm")?.value || "";
  const btn = document.getElementById("btnRegSubmit");

  if (mat_khau !== mat_khau2) {
    show(errorRegMsg, "❌ Mật khẩu nhập lại không khớp!");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Đang xử lý...";
  }

  try {
    const r = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ho_ten, email, mat_khau }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = [data.message, data.detail, data.code]
        .filter(Boolean)
        .join(" — ");
      throw new Error(msg || "Lỗi đăng ký");
    }

    show(
      successMsg,
      "✅ " +
        (data.message ||
          "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận, sau đó chờ Admin duyệt."),
    );
    frmRegister.reset();

    setTimeout(() => {
      hide(successMsg);
      gotoLogin();
    }, 1200);
  } catch (err) {
    show(errorRegMsg, "❌ " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Đăng ký";
    }
  }
});

// LOGIN
frmLogin?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hide(errorMsg);

  const username = document.getElementById("loginUser")?.value.trim() || "";
  const password = document.getElementById("loginPass")?.value || "";
  const btn = document.getElementById("btnLoginSubmit");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Đang kiểm tra...";
  }

  try {
    const r = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || "Lỗi đăng nhập");

    // ✅ Lưu token + roles + permissions
    localStorage.setItem("webgis_token", data.token);
    localStorage.setItem("webgis_roles", JSON.stringify(data.roles || []));
    localStorage.setItem(
      "webgis_permissions",
      JSON.stringify(data.permissions || []),
    );
    localStorage.setItem(
      "webgis_perms",
      JSON.stringify(data.permissions || []),
    ); // compat
    localStorage.setItem("webgis_user", data.ho_ten || "");

    // compat role cũ
    const roles = (data.roles || []).map((x) => (x || "").toLowerCase());
    const mainRole = roles.includes("admin")
      ? "admin"
      : roles.includes("can_bo")
        ? "can_bo"
        : "guest";
    localStorage.setItem("webgis_role", mainRole);

    window.location.href = "index.html";
  } catch (err) {
    show(errorMsg, "❌ " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Đăng nhập";
    }
  }
});
// ===== FORGOT/RESET PASSWORD FLOW (FIX UI + FIX API_BASE) =====
const secForgot = document.getElementById("forgotBox");
const secReset = document.getElementById("resetBox");

const btnToForgot = document.getElementById("btnToForgot");
const btnBackToLogin1 = document.getElementById("btnBackToLogin1");
const btnBackToLogin2 = document.getElementById("btnBackToLogin2");

const btnForgotSubmit = document.getElementById("btnForgotSubmit");
const btnResetSubmit = document.getElementById("btnResetSubmit");

const forgotEmail = document.getElementById("forgotEmail");
const resetEmail = document.getElementById("resetEmail");
const resetPass = document.getElementById("resetPass");
const resetPass2 = document.getElementById("resetPass2");

const forgotMsg = document.getElementById("forgotMsg");
const forgotErr = document.getElementById("forgotErr");
const resetMsg = document.getElementById("resetMsg");
const resetErr = document.getElementById("resetErr");

function setActiveSection(sec) {
  [secLogin, secRegister, secForgot, secReset].forEach((s) =>
    s?.classList.remove("active"),
  );
  sec?.classList.add("active");
}

function gotoForgot() {
  setActiveSection(secForgot);
  hide(forgotMsg);
  hide(forgotErr);
  hide(resetMsg);
  hide(resetErr);
}

function gotoReset() {
  setActiveSection(secReset);
  hide(forgotMsg);
  hide(forgotErr);
  hide(resetMsg);
  hide(resetErr);
}

// Click "Quên mật khẩu?"
btnToForgot?.addEventListener("click", (e) => {
  e.preventDefault();
  gotoForgot();
  forgotEmail?.focus();
});

// Back
btnBackToLogin1?.addEventListener("click", (e) => {
  e.preventDefault();
  gotoLogin();
});
btnBackToLogin2?.addEventListener("click", (e) => {
  e.preventDefault();
  gotoLogin();
});

// Nếu URL có reset token -> mở form đổi mật khẩu
if (resetToken) {
  gotoReset();
  // bỏ query khỏi URL (nhưng vẫn giữ resetToken trong biến)
  window.history.replaceState({}, "", "login.html");
  resetEmail?.focus();
}

// Gửi mail reset
btnForgotSubmit?.addEventListener("click", async () => {
  hide(forgotMsg);
  hide(forgotErr);

  const email = (forgotEmail?.value || "").trim();
  if (!email) {
    show(forgotErr, "❌ Vui lòng nhập email.");
    return;
  }

  btnForgotSubmit.disabled = true;
  btnForgotSubmit.textContent = "⏳ Đang gửi...";

  try {
    const res = await fetch(`${API_BASE}/api/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Gửi thất bại");

    show(
      forgotMsg,
      data.message ||
        "✅ Nếu email tồn tại, hệ thống đã gửi link đổi mật khẩu.",
    );
  } catch (err) {
    show(forgotErr, "❌ " + (err.message || err));
  } finally {
    btnForgotSubmit.disabled = false;
    btnForgotSubmit.textContent = "Gửi link đổi mật khẩu";
  }
});

// Đổi mật khẩu
btnResetSubmit?.addEventListener("click", async () => {
  hide(resetMsg);
  hide(resetErr);

  const email = (resetEmail?.value || "").trim();
  const p1 = resetPass?.value || "";
  const p2 = resetPass2?.value || "";

  if (!resetToken) {
    show(resetErr, "❌ Link reset không hợp lệ (thiếu token).");
    return;
  }
  if (!email) {
    show(resetErr, "❌ Vui lòng nhập email.");
    return;
  }
  if (p1.length < 6) {
    show(resetErr, "❌ Mật khẩu tối thiểu 6 ký tự.");
    return;
  }
  if (p1 !== p2) {
    show(resetErr, "❌ Mật khẩu nhập lại không khớp.");
    return;
  }

  btnResetSubmit.disabled = true;
  btnResetSubmit.textContent = "⏳ Đang cập nhật...";

  try {
    const res = await fetch(`${API_BASE}/api/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, email, new_password: p1 }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Đổi mật khẩu thất bại");

    show(
      resetMsg,
      data.message || "✅ Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.",
    );
    setTimeout(() => gotoLogin(), 1200);
  } catch (err) {
    show(resetErr, "❌ " + (err.message || err));
  } finally {
    btnResetSubmit.disabled = false;
    btnResetSubmit.textContent = "Cập nhật mật khẩu";
  }
});
