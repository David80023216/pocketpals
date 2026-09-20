/* Pocket Pals — cloud accounts & friends (Firebase Auth + Firestore).
   Gracefully degrades to local-only play when Firebase isn't configured.
   Local Game.save() auto-syncs to the cloud (debounced + throttled). */
"use strict";

const Cloud = (() => {
  const PUSH_DEBOUNCE_MS = 1500;
  const PUSH_THROTTLE_MS = 60000; // at most one cloud write per minute
  const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const GIFT_COINS = 20;
  const GIFT_MAX_PER_DAY = 3;

  let app = null, auth = null, db = null, me = null, inited = false;
  let pushTimer = null, suppressPush = false, lastPush = 0, lastCloudTs = 0;
  let myCode = null;
  const authListeners = [];
  const syncListeners = [];

  const configured = () => !!window.FIREBASE_ENABLED;
  const ready = () => inited && !!db && typeof firebase !== "undefined";
  const currentUser = () => me;
  const onAuth = (fn) => { authListeners.push(fn); };
  const onSync = (fn) => { syncListeners.push(fn); };
  const emitSync = () => {
    syncListeners.forEach(fn => { try { fn(); } catch (e) {} });
    try { window.dispatchEvent(new Event("pp-cloud-sync")); } catch (e) {}
  };

  function init() {
    if (inited || !configured() || typeof firebase === "undefined") return false;
    try {
      app = firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      inited = true;
      auth.onAuthStateChanged(async (user) => {
        me = user;
        if (user) { try { await pull(); } catch (e) { console.warn("cloud pull failed", e); } }
        authListeners.forEach(fn => { try { fn(user); } catch (e) {} });
      });
      return true;
    } catch (e) { console.warn("firebase init failed", e); return false; }
  }

  /* ---------- auth ---------- */
  async function signIn() {
    if (!ready()) return { ok: false, msg: "Online features aren't set up yet." };
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      return { ok: true };
    } catch (e) {
      if (e && e.code === "auth/popup-closed-by-user") return { ok: false, msg: "Sign-in cancelled." };
      return { ok: false, msg: (e && e.message) || "Sign-in failed." };
    }
  }
  function signOut() {
    if (auth) auth.signOut();
    me = null;
    authListeners.forEach(fn => { try { fn(null); } catch (e) {} });
  }

  /* ---------- state sync ---------- */
  const userDoc = () => db.collection("users").doc(me.uid);

  function snapshot() {
    const s = Game.state();
    return {
      v: 1,
      coins: s.coins, gems: s.gems,
      pets: s.pets, activePetId: s.activePetId, maxPets: s.maxPets,
      streak: s.streak, sitterUntil: s.sitterUntil, background: s.background,
      cooldowns: s.cooldowns, lastPetAt: s.lastPetAt, createdAt: s.createdAt,
      updatedAt: Date.now(),
    };
  }

  function pushSoon() {
    if (!ready() || !me || suppressPush) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const now = Date.now();
      if (now - lastPush < PUSH_THROTTLE_MS) return;
      lastPush = now;
      try {
        const data = snapshot();
        await userDoc().set(data, { merge: true });
        lastCloudTs = data.updatedAt;
      } catch (e) { /* offline — will retry on next save */ }
    }, PUSH_DEBOUNCE_MS);
  }

  function genCode() {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }
  async function claimCode(ref) {
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const q = await db.collection("users").where("friendCode", "==", code).limit(1).get();
      if (q.empty) { await ref.set({ friendCode: code }, { merge: true }); return code; }
    }
    const code = genCode() + genCode().slice(0, 2);
    await ref.set({ friendCode: code }, { merge: true });
    return code;
  }

  async function pull() {
    if (!me) return;
    const ref = userDoc();
    const snap = await ref.get();
    if (!snap.exists) {
      // First sign-in: migrate this device's local game to the cloud.
      const data = snapshot();
      data.displayName = me.displayName || "Player";
      data.photoURL = me.photoURL || null;
      await ref.set(data);
      myCode = await claimCode(ref);
      lastCloudTs = data.updatedAt;
      emitSync();
      return;
    }
    const cloud = snap.data();
    if (!cloud.friendCode) cloud.friendCode = await claimCode(ref);
    myCode = cloud.friendCode;
    if (me.displayName && cloud.displayName !== me.displayName) {
      ref.set({ displayName: me.displayName, photoURL: me.photoURL || null }, { merge: true });
    }
    if ((cloud.updatedAt || 0) > lastCloudTs) {
      suppressPush = true;
      try { Game.importState(cloud); } finally { suppressPush = false; }
      lastCloudTs = cloud.updatedAt || Date.now();
      emitSync();
    }
  }

  async function myProfile() {
    if (!ready() || !me) return null;
    const s = await userDoc().get();
    return s.exists ? Object.assign({ uid: me.uid }, s.data()) : null;
  }
  const myFriendCode = () => myCode;

  /* ---------- friends ---------- */
  async function addFriend(code) {
    code = String(code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6,8}$/.test(code)) return { ok: false, msg: "Enter a 6-character friend code." };
    const q = await db.collection("users").where("friendCode", "==", code).limit(1).get();
    if (q.empty) return { ok: false, msg: "No player found with that code. 🤔" };
    const doc = q.docs[0];
    if (doc.id === me.uid) return { ok: false, msg: "That's your own code! 😄" };
    const d = doc.data();
    const ap = (d.pets || []).find(p => p.id === d.activePetId) || (d.pets || [])[0] || null;
    await userDoc().collection("friends").doc(doc.id).set({
      uid: doc.id,
      displayName: d.displayName || "Player",
      photoURL: d.photoURL || null,
      friendCode: code,
      petName: ap ? ap.name : null,
      petSpecies: ap ? ap.species : null,
      petStage: ap ? ap.stage : null,
      petLevel: ap ? ap.level : null,
      addedAt: Date.now(),
    });
    return { ok: true, name: d.displayName || "Player" };
  }
  async function listFriends() {
    const s = await userDoc().collection("friends").orderBy("addedAt", "desc").get();
    return s.docs.map(d => d.data());
  }
  async function removeFriend(uid) {
    await userDoc().collection("friends").doc(uid).delete();
  }
  async function getProfile(uid) {
    const s = await db.collection("users").doc(uid).get();
    return s.exists ? Object.assign({ uid }, s.data()) : null;
  }
  const totalLevels = (profile) => (profile.pets || []).reduce((a, p) => a + (p.level || 1), 0);

  /* ---------- gifts & cheers (via inbox) ---------- */
  const dayKey = () => new Date().toISOString().slice(0, 10);
  function caps() {
    try { return JSON.parse(localStorage.getItem("pocketpals_caps") || "{}"); } catch { return {}; }
  }
  function bumpCap(key, max) {
    const c = caps(), k = dayKey() + ":" + key, n = (c[k] || 0) + 1;
    if (n > max) return false;
    c[k] = n;
    try { localStorage.setItem("pocketpals_caps", JSON.stringify(c)); } catch {}
    return true;
  }

  async function sendGift(friendUid) {
    if (!ready() || !me) return { ok: false, msg: "Sign in first!" };
    if (!bumpCap("gifts", GIFT_MAX_PER_DAY)) return { ok: false, msg: `Gift limit reached (${GIFT_MAX_PER_DAY}/day). 🎁` };
    if (Game.state().coins < GIFT_COINS) return { ok: false, msg: `You need ${GIFT_COINS} coins to send a gift.` };
    Game.addCoins(-GIFT_COINS);
    await db.collection("users").doc(friendUid).collection("inbox").add({
      type: "gift", fromUid: me.uid, fromName: me.displayName || "Player",
      coins: GIFT_COINS, createdAt: Date.now(), claimed: false,
    });
    return { ok: true };
  }
  async function cheerFriend(friendUid) {
    if (!ready() || !me) return { ok: false, msg: "Sign in first!" };
    if (!bumpCap("cheer:" + friendUid, 1)) return { ok: false, msg: "You already cheered them today! 📣" };
    await db.collection("users").doc(friendUid).collection("inbox").add({
      type: "cheer", fromUid: me.uid, fromName: me.displayName || "Player",
      coins: 0, createdAt: Date.now(), claimed: false,
    });
    return { ok: true };
  }
  async function fetchInbox() {
    const s = await userDoc().collection("inbox").orderBy("createdAt", "desc").limit(30).get();
    return s.docs.filter(d => !d.data().claimed).map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
  }
  async function claimItem(item) {
    if (item.type === "gift") {
      Game.addCoins(item.coins || 0);
    } else if (item.type === "cheer") {
      const p = Game.activePet();
      if (p) { p.happiness = Math.min(100, p.happiness + 10); p.updatedAt = Date.now(); }
    }
    Game.save();
    try { await item.ref.update({ claimed: true }); } catch (e) {}
    return item;
  }

  return {
    init, configured, ready, currentUser, onAuth, onSync,
    signIn, signOut, pushSoon, pull,
    myProfile, myFriendCode,
    addFriend, listFriends, removeFriend, getProfile, totalLevels,
    sendGift, cheerFriend, fetchInbox, claimItem,
    GIFT_COINS,
  };
})();
