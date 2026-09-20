# 👥 Turning on sign-in & friends (free, ~10 minutes)

The code is already wired up. You just need a free Firebase project so the
game has somewhere to store accounts. Nothing here costs money — the free
"Spark" plan is plenty for this game.

## Steps

1. **Create the project**
   - Go to https://console.firebase.google.com → **Add project**
   - Name it `pocket-pals` (any name works). You can skip Google Analytics.

2. **Turn on Google sign-in**
   - Left menu: **Build → Authentication → Get started**
   - **Sign-in method** tab → enable **Google** → pick your support email → Save.

3. **Register the web app & copy your keys**
   - Click **Project Overview** (top of left menu) → **Add app** → Web icon `</>`
   - Nickname: `pocketpals-web`. (No need to tick Firebase Hosting.)
   - Copy the `firebaseConfig = { ... }` values it shows you.

4. **Paste the keys into the game**
   - Open `js/firebase-config.js` in the repo
   - Replace every `PASTE_YOUR_*` value with your real values. That's it —
     `FIREBASE_ENABLED` flips on automatically.

5. **Create the database**
   - Left menu: **Build → Firestore Database → Create database**
   - Choose **Start in production mode**, pick the region closest to you.

6. **Publish the security rules**
   - In Firestore Database, open the **Rules** tab
   - Delete what's there, paste in the entire contents of `firestore.rules`
     from this repo → **Publish**.

7. **Allow your live site**
   - **Build → Authentication → Settings → Authorized domains → Add domain**
   - Add `david80023216.github.io`

8. **Deploy & test**
   - Upload the updated files to GitHub (the site redeploys automatically).
   - Open the live **👥 Friends** page → **Sign in with Google**.
   - In the Firebase console you should see yourself appear under
     **Firestore Database → Data → users** — with a `friendCode`. 🎉

## How it works (for the curious)

- Your pets still save in the browser first, so the game works offline.
- When signed in, saves quietly sync to the cloud (max once a minute).
- Signing in on a new device pulls your cloud save down; your local pets
  upload on first sign-in, so nothing is lost.
- Friends are added by 6-character code. You can visit a friend's pal,
  send coin gifts (20 coins, 3 per day) and free daily cheers (+10 happiness).
- The leaderboard ranks you and your friends by total pet levels.
- Nobody can read your game data except signed-in players, and nobody can
  write to it except you (enforced by `firestore.rules`).
