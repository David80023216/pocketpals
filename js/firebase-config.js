/* Pocket Pals — Firebase config.
   ------------------------------------------------------------------
   STEVE: to turn on sign-in + friends, follow FIREBASE_SETUP.md, then
   paste your web app's keys below (replace every PASTE_YOUR_* value).
   Until then the game works exactly as before, 100% offline/local.
*/
"use strict";

const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

/* true once real keys are pasted in */
const FIREBASE_ENABLED = !String(FIREBASE_CONFIG.apiKey).includes("PASTE");
