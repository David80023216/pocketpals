/* Pocket Pals — Firebase config.
   ------------------------------------------------------------------
   Live keys for the "pocket-pals" Firebase project (free Spark plan),
   set up 2026-09-20. Assigned on window so js/cloud.js can read them
   as window.FIREBASE_CONFIG / window.FIREBASE_ENABLED.
*/
"use strict";

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDIGj0CEFF_miGEOc01U5cOeTqKIYGbYDc",
  authDomain: "pocket-pals-afde6.firebaseapp.com",
  projectId: "pocket-pals-afde6",
  storageBucket: "pocket-pals-afde6.firebasestorage.app",
  messagingSenderId: "802262571903",
  appId: "1:802262571903:web:33107e86473c1d1901d84a"
};

/* true once real keys are pasted in */
window.FIREBASE_ENABLED =
  !String(window.FIREBASE_CONFIG.apiKey || "").includes("PASTE");
