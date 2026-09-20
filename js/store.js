/* Pocket Pals — gem store front-end.
 * Gems buy ONLY deterministic perks (see data.js GEM_SHOP). Never randomness.
 *
 * SETUP (same pattern as PackStorm):
 *  1. Create 3 Stripe Payment Links (100 / 550 / 1500 gems), each with metadata gems=<n>.
 *  2. Set each link's success URL to: https://<worker>.workers.dev/success?session_id={CHECKOUT_SESSION_ID}
 *  3. Paste the 3 Payment Link URLs + your Worker URL below.
 *  4. Deploy worker.js (wrangler.toml) with secrets STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CODE_SECRET.
 */
"use strict";

const STORE = {
  workerUrl: "REPLACE_WITH_WORKER_URL", // e.g. https://pocketpals-gems.you.workers.dev
  links: {
    gems100: "REPLACE_WITH_STRIPE_LINK_100",
    gems550: "REPLACE_WITH_STRIPE_LINK_550",
    gems1500: "REPLACE_WITH_STRIPE_LINK_1500",
  },
};

(function init() {
  const $ = (s) => document.querySelector(s);
  const s = Game.state();
  $("#w-coins").textContent = "🪙 " + s.coins;
  $("#w-gems").textContent = "💎 " + s.gems;

  $("#packs").innerHTML = PP.GEM_PACKS.map((p) => `
    <div class="card shop-item pack">
      <div class="gems">💎 ${p.gems.toLocaleString()}</div>
      <h3>${p.price}</h3><p>${p.blurb}</p>
      <button class="btn" data-pack="${p.id}">Buy gems</button>
    </div>`).join("");

  document.querySelectorAll("[data-pack]").forEach((b) => (b.onclick = () => {
    const url = STORE.links[b.dataset.pack];
    if (!url || url.startsWith("REPLACE")) {
      toast("Checkout isn't connected yet — the owner is still setting up payments. 🛠️");
      return;
    }
    location.href = url;
  }));

  $("#redeem").onclick = async () => {
    const code = $("#code").value.trim().toUpperCase();
    const msg = $("#redeem-msg");
    if (!code) { msg.textContent = "Enter a code first!"; return; }
    if (STORE.workerUrl.startsWith("REPLACE")) { msg.textContent = "Redemption isn't connected yet — check back soon! 🛠️"; return; }
    msg.textContent = "Checking…";
    try {
      const r = await fetch(STORE.workerUrl + "/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (j.ok) {
        Game.addGems(j.gems);
        $("#w-gems").textContent = "💎 " + Game.state().gems;
        msg.textContent = `🎉 ${j.gems} gems added! Go spoil your pal!`;
        $("#code").value = "";
      } else msg.textContent = "😕 " + (j.error || "That code didn't work.");
    } catch { msg.textContent = "😕 Couldn't reach the server — try again in a bit."; }
  };

  function toast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = m;
    document.getElementById("toasts").appendChild(t); setTimeout(() => t.remove(), 4200);
  }
})();
