/* Pocket Pals — nav auth widget: sign-in button / player chip in the nav bar. */
"use strict";

(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function render() {
    const slot = document.getElementById("auth-slot");
    if (!slot || typeof Cloud === "undefined") return;
    if (!Cloud.configured() || !Cloud.ready()) { slot.innerHTML = ""; slot.style.display = "none"; return; }
    slot.style.display = "";
    const u = Cloud.currentUser();
    if (!u) {
      slot.innerHTML = `<button class="auth-btn" id="pp-signin">🔑 Sign in</button>`;
      document.getElementById("pp-signin").onclick = async () => {
        const btn = document.getElementById("pp-signin");
        btn.disabled = true; btn.textContent = "…";
        const r = await Cloud.signIn();
        if (!r.ok) { alert(r.msg); render(); }
      };
    } else {
      const avatar = u.photoURL
        ? `<img class="auth-avatar" src="${esc(u.photoURL)}" alt="">`
        : `<span class="auth-avatar auth-avatar-fallback">👤</span>`;
      slot.innerHTML = `${avatar}<span class="auth-name">${esc(u.displayName || "Player")}</span>` +
        `<button class="auth-btn ghost" id="pp-signout" title="Sign out">🚪</button>`;
      document.getElementById("pp-signout").onclick = () => {
        if (confirm("Sign out of Pocket Pals? Your pals stay saved on this device.")) Cloud.signOut();
      };
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (typeof Cloud === "undefined") return;
    Cloud.init();
    Cloud.onAuth(render);
    render();
  });
})();
