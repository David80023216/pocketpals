/* Pocket Pals — Cloudflare Worker: Stripe -> single-use gem codes.
 * Gems buy ONLY deterministic perks. No money touches randomness.
 *
 * Secrets (wrangler secret put): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CODE_SECRET
 * KV: gem_codes (bind in wrangler.toml)
 * Stripe webhook: <worker>/webhook  (event: checkout.session.completed)
 * Payment Link success URL: https://<worker>/success?session_id={CHECKOUT_SESSION_ID}
 */
"use strict";

const SITE = "https://REPLACE_WITH_YOUR_SITE"; // e.g. https://you.github.io/pocketpals

const enc = new TextEncoder();
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const a = crypto.getRandomValues(new Uint8Array(6));
  const s = [...a].map(b => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  return `PP-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
async function signCode(code, gems, secret) {
  return (await hmacHex(secret, `${code}:${gems}`)).slice(0, 16);
}
const json = (o, st = 200) => new Response(JSON.stringify(o),
  { status: st, headers: { "Content-Type": "application/json" } });

async function stripeGet(path, env) {
  const r = await fetch(`https://api.stripe.com${path}`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  return r.json();
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    /* ---- Stripe webhook: issue a gem code on completed checkout ---- */
    if (url.pathname === "/webhook" && req.method === "POST") {
      const raw = await req.text();
      const sig = req.headers.get("stripe-signature") || "";
      const parts = Object.fromEntries(sig.split(",").map(p => p.split("=")));
      if (!parts.t || !parts.v1) return json({ error: "bad signature" }, 400);
      const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${parts.t}.${raw}`);
      const ok = expected.length === parts.v1.length &&
        crypto.subtle.timingSafeEqual
          ? [...expected].every((c, i) => c === parts.v1[i]) : expected === parts.v1;
      if (!ok) return json({ error: "bad signature" }, 400);
      let evt; try { evt = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }
      if (evt.type === "checkout.session.completed") {
        const sess = evt.data.object;
        const gems = parseInt(sess.metadata?.gems || "0", 10);
        if (gems > 0 && sess.payment_status === "paid") {
          const code = makeCode();
          const sig16 = await signCode(code, gems, env.CODE_SECRET);
          await env.gem_codes.put(`code:${code}`,
            JSON.stringify({ gems, sig: sig16, redeemed: false, session: sess.id, at: Date.now() }));
        }
      }
      return json({ received: true });
    }

    /* ---- success page: show the buyer's code ---- */
    if (url.pathname === "/success") {
      const sid = url.searchParams.get("session_id");
      let codeHtml = "<p>We couldn't find your code yet — it usually appears within a minute. Your receipt email has it too.</p>";
      if (sid) {
        const sess = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(sid)}`, env);
        if (sess.payment_status === "paid") {
          const list = await env.gem_codes.list({ prefix: "code:" });
          for (const k of list.keys) {
            const v = JSON.parse(await env.gem_codes.get(k.name));
            if (v.session === sid) {
              codeHtml = `<p>Your gem code:</p><h2 style="letter-spacing:2px">${k.name.slice(5)}</h2>
                <p>Enter it on the <a href="${SITE}/store.html">Gem Store</a> page. Worth ${v.gems} 💎.</p>`;
              break;
            }
          }
        }
      }
      return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Gems incoming! — Pocket Pals</title></head>
        <body style="font-family:system-ui;text-align:center;padding:60px 20px">
        <h1>🎉 Payment successful!</h1>${codeHtml}</body></html>`,
        { headers: { "Content-Type": "text/html" } });
    }

    /* ---- redeem a code (single-use, HMAC-verified) ---- */
    if (url.pathname === "/redeem" && req.method === "POST") {
      let body; try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
      const code = (body.code || "").trim().toUpperCase();
      if (!/^PP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code))
        return json({ error: "That doesn't look like a gem code." }, 400);
      const rawV = await env.gem_codes.get(`code:${code}`);
      if (!rawV) return json({ error: "Code not found." }, 404);
      const v = JSON.parse(rawV);
      if (v.redeemed) return json({ error: "This code was already redeemed." }, 410);
      const sig16 = await signCode(code, v.gems, env.CODE_SECRET);
      if (sig16 !== v.sig) return json({ error: "Code failed verification." }, 403);
      v.redeemed = true; v.redeemedAt = Date.now();
      await env.gem_codes.put(`code:${code}`, JSON.stringify(v));
      return json({ ok: true, gems: v.gems });
    }

    return new Response("Pocket Pals gem server 🐾", { status: 404 });
  },
};
