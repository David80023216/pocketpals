# 🐾 Pocket Pals

A free virtual pet game: **Adopt. Nurture. Evolve.**

Adopt a magical pal, keep its hunger / happiness / energy up in real time, earn coins,
unlock hats and upgrades, evolve your baby into its adult form at level 5, and keep
daily streaks alive. Gems unlock fixed perks (extra pals, Pet Sitter, golden den) —
never random draws.

## Files

| File | What it is |
|---|---|
| `index.html` | Landing + adoption flow |
| `play.html` | Main dashboard: needs, actions, XP, streaks, events |
| `collection.html` | Your adopted pals, switch active pal |
| `shop.html` | Coin shop + gem upgrades |
| `store.html` / `js/store.js` | Real-money gem store (Stripe) |
| `about.html` | How to play, fair-play promise, privacy |
| `js/data.js` | Species, shop items, tuning |
| `js/game.js` | Engine: decay, actions, streaks, events, evolution |
| `css/styles.css` | Pastel theme |
| `assets/pets/` | 12 AI-generated pet portraits (6 babies + 6 adults) |
| `friends.html` | Friends hub: friend codes, gifts, cheers, visits, leaderboard |
| `js/cloud.js` | Firebase Auth + Firestore: sign-in, cloud saves, friends, inbox |
| `js/nav-auth.js` | Sign-in button / player chip in the nav bar |
| `js/firebase-config.js` | Paste your Firebase web keys here (see `FIREBASE_SETUP.md`) |
| `firestore.rules` | Firestore security rules for the friends features |
| `FIREBASE_SETUP.md` | Free ~10-min setup guide to switch on sign-in & friends |
| `worker.js` / `wrangler.toml` | Cloudflare Worker: Stripe → single-use gem codes |

Game state lives in the browser (`localStorage`) and plays fully offline — no
accounts needed. Optionally, sign in with Google (Firebase, free) to cloud-save
your pals across devices and play with friends. Until keys are pasted into
`js/firebase-config.js`, the site simply runs in local-only mode.

## Deploy the site (free)

Any static host works: GitHub Pages, Netlify Drop, Cloudflare Pages. Upload the whole
folder; `index.html` is the entry point.

## Enable real-money gem sales (optional, later)

Gems buy **only deterministic perks** — no money touches randomness.

1. Create 3 Stripe Payment Links: 100 gems ($0.99), 550 ($3.99), 1500 ($9.99).
   Add metadata `gems=100` / `gems=550` / `gems=1500` on each.
2. Set each link's success URL to `https://<worker>.workers.dev/success?session_id={CHECKOUT_SESSION_ID}`.
3. `wrangler kv:namespace create gem_codes` → paste the id into `wrangler.toml`.
4. `wrangler secret put STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CODE_SECRET` (random string).
5. Add the Stripe webhook endpoint `https://<worker>.workers.dev/webhook` for `checkout.session.completed`.
6. `wrangler deploy`.
7. In `js/store.js`: paste the Worker URL and the 3 Payment Link URLs.
8. In `worker.js`: replace `REPLACE_WITH_YOUR_SITE` and the support email in `store.html`.
9. Test end-to-end in Stripe test mode before going live.

## Ad monetization

`<!-- AD SLOT -->` placeholders are in `index.html`, `play.html`, `shop.html`, `about.html`.
Paste in Ezoic / Media.net / gaming-network tags when ready. The game is engineered
for high pageviews-per-session, which is what display ads pay for.

## Tuning

All game balance lives in `js/data.js`: decay rates, action rewards, XP curve,
evolution level, streak payouts, shop prices. Tweak freely.
