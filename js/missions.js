/* Pocket Pals — Daily missions.
   ------------------------------------------------------------------
   Standalone module (no load-time dependencies). Tracks daily action
   counters in localStorage, picks a deterministic set of missions per
   calendar day, and grants fixed coin/gem rewards through Game when
   claimed. Game pages bump counters via Missions.bump("<counter>").
*/
"use strict";

window.Missions = (() => {
  const STORE_KEY = "pp_missions_v1";

  const POOL = [
    { id: "feed",    emoji: "🍖", text: "Feed your pal 3 times",           goal: 3,  reward: { coins: 30 } },
    { id: "play",    emoji: "🎾", text: "Play with your pal 3 times",      goal: 3,  reward: { coins: 30 } },
    { id: "nap",     emoji: "😴", text: "Tuck your pal in for 2 naps",     goal: 2,  reward: { coins: 25 } },
    { id: "pet",     emoji: "👋", text: "Pet your pal 10 times",           goal: 10, reward: { coins: 25 } },
    { id: "shop",    emoji: "🛍️", text: "Buy something in the Shop",        goal: 1,  reward: { coins: 30 } },
    { id: "store",   emoji: "💎", text: "Visit the Gem Store",             goal: 1,  reward: { coins: 15 } },
    { id: "thrive",  emoji: "🌟", text: "Get all needs above 75 at once",  goal: 1,  reward: { coins: 40 } },
    { id: "levelup", emoji: "⬆️", text: "Level up any pal",                goal: 1,  reward: { gems: 1 } },
    { id: "gift",    emoji: "🎁", text: "Send a gift to a friend",         goal: 1,  reward: { coins: 35 }, needsSignIn: true },
    { id: "cheer",   emoji: "📣", text: "Cheer a friend's pal",            goal: 1,  reward: { coins: 20 }, needsSignIn: true },
  ];
  const DAILY_COUNT = 6;
  const ALL_BONUS = { coins: 50, gems: 1 };

  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function persist(all) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function dayState() {
    const all = load();
    const k = dayStr();
    if (!all[k]) { all[k] = { counters: {}, claimed: {} }; persist(all); }
    return all[k];
  }
  function signedIn() {
    try { return !!(window.Cloud && typeof Cloud.ready === "function" && Cloud.ready() && Cloud.user); }
    catch (e) { return false; }
  }

  /* Deterministic daily set: rotate the pool by a hash of the date so the
     lineup changes day to day. The Gem Store visit is always included —
     it funnels players to the store. Sign-in missions only appear signed in. */
  function dailyPick() {
    const k = dayStr();
    let h = 0;
    for (const c of k) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
    const rot = h % POOL.length;
    const rotated = POOL.slice(rot).concat(POOL.slice(0, rot));
    const ok = signedIn();
    const avail = rotated.filter(m => !m.needsSignIn || ok);
    const pick = avail.slice(0, DAILY_COUNT);
    if (!pick.some(m => m.id === "store")) {
      const store = POOL.find(m => m.id === "store");
      if (avail.includes(store)) pick[pick.length - 1] = store;
    }
    return pick;
  }

  function bump(counter) {
    const d = dayState();
    d.counters[counter] = Math.min(999, (d.counters[counter] || 0) + 1);
    const all = load(); all[dayStr()] = d; persist(all);
  }

  /* Latches the "thriving" mission the moment all needs are >= 75. */
  function checkThrive() {
    try {
      const p = window.Game && Game.activePet && Game.activePet();
      if (p && p.hunger >= 75 && p.happiness >= 75 && p.energy >= 75) {
        const d = dayState();
        if (!d.counters.thrive) {
          d.counters.thrive = 1;
          const all = load(); all[dayStr()] = d; persist(all);
        }
      }
    } catch (e) {}
  }

  function progress(m) {
    const d = dayState();
    const count = Math.min(m.goal, d.counters[m.id] || 0);
    return { count: count, done: count >= m.goal, claimed: !!d.claimed[m.id] };
  }

  function list() {
    return dailyPick().map(m => Object.assign({}, m, progress(m)));
  }

  function summary() {
    const items = list();
    return {
      done: items.filter(i => i.done).length,
      total: items.length,
      claimable: items.filter(i => i.done && !i.claimed).length,
      bonusClaimed: !!dayState().bonusClaimed,
    };
  }

  function rewardText(r) {
    const parts = [];
    if (r.coins) parts.push("🪙 " + r.coins);
    if (r.gems) parts.push("💎 " + r.gems);
    return parts.join(" + ");
  }

  function claim(id) {
    const m = POOL.find(x => x.id === id);
    if (!m) return { ok: false, msg: "Mission not found." };
    const all = load();
    const k = dayStr();
    const d = all[k] || { counters: {}, claimed: {} };
    const count = Math.min(m.goal, d.counters[m.id] || 0);
    if (count < m.goal) return { ok: false, msg: "Not complete yet — keep going!" };
    if (d.claimed[m.id]) return { ok: false, msg: "Already claimed!" };
    if (!window.Game) return { ok: false, msg: "Game isn't ready yet." };
    if (m.reward.coins) Game.addCoins(m.reward.coins);
    if (m.reward.gems) Game.addGems(m.reward.gems);
    d.claimed[m.id] = true;
    let bonusMsg = "";
    if (!d.bonusClaimed && dailyPick().every(x => d.claimed[x.id])) {
      d.bonusClaimed = true;
      Game.addCoins(ALL_BONUS.coins);
      Game.addGems(ALL_BONUS.gems);
      bonusMsg = " 🏆 All missions complete! Bonus: " + rewardText(ALL_BONUS) + "!";
    }
    all[k] = d; persist(all);
    return { ok: true, msg: "+" + rewardText(m.reward) + " collected!" + bonusMsg };
  }

  return {
    bump, checkThrive, list, summary, claim, rewardText,
    bonus: () => ALL_BONUS,
    bonusClaimed: () => !!dayState().bonusClaimed,
  };
})();
