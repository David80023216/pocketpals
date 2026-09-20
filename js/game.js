/* Pocket Pals — game engine: state, decay, actions, streaks, events, evolution */
"use strict";

const Game = (() => {
  const KEY = "pocketpals_v1";
  const DAY = 86400000;

  const blank = () => ({
    v: 1, coins: 20, gems: 0,
    pets: [], activePetId: null, maxPets: 1,
    streak: { count: 0, lastVisit: null },
    sitterUntil: 0, background: "default",
    cooldowns: {}, // actionId -> timestamp when usable again
    lastPetAt: 0, // timestamp of last effective petting (anti-spam)
    createdAt: Date.now(),
  });

  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const s = JSON.parse(raw);
      return Object.assign(blank(), s);
    } catch { return blank(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
  const uid = () => "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  /* ---------- decay ---------- */
  function decayMult(pet, forActive) {
    let m = forActive ? 1 : PP.INACTIVE_DECAY_MULT;
    if (Date.now() < S.sitterUntil) m *= PP.SITTER_DECAY_MULT;
    if (pet.species === "pebbles") m *= PP.PEBBLES_DECAY_MULT;
    return m;
  }
  function applyDecay(pet, forActive) {
    const now = Date.now();
    const elapsedHrs = Math.max(0, (now - (pet.updatedAt || now)) / 3600000);
    if (elapsedHrs <= 0) { pet.updatedAt = now; return; }
    const m = decayMult(pet, forActive);
    for (const need of ["hunger", "happiness", "energy"]) {
      pet[need] = Math.max(0, Math.min(100, pet[need] - PP.DECAY_PER_HOUR[need] * elapsedHrs * m));
    }
    pet.updatedAt = now;
  }
  function tickAll() {
    const now = Date.now();
    for (const pet of S.pets) applyDecay(pet, pet.id === S.activePetId);
    save();
    return now;
  }

  /* ---------- pets ---------- */
  function adopt(species, name) {
    name = (name || "").trim().slice(0, 14) || PP.SPECIES[species].babyName;
    const pet = {
      id: uid(), species, name, stage: "baby",
      level: 1, xp: 0,
      hunger: 85, happiness: 85, energy: 85,
      hat: null, adoptedAt: Date.now(), updatedAt: Date.now(),
    };
    S.pets.push(pet);
    S.activePetId = pet.id;
    save();
    return pet;
  }
  const activePet = () => S.pets.find(p => p.id === S.activePetId) || null;
  const petById = (id) => S.pets.find(p => p.id === id) || null;
  const speciesOf = (pet) => PP.SPECIES[pet.species];
  const displayName = (pet) => pet.stage === "baby" ? speciesOf(pet).babyName : speciesOf(pet).adultName;
  const artFor = (pet) => `assets/pets/${pet.species}-${pet.stage}.webp`;
  const videoFor = (pet) => `assets/pets/${pet.species}-${pet.stage}-idle.mp4`;

  function mood(pet) {
    const needs = [pet.hunger, pet.happiness, pet.energy];
    const avg = needs.reduce((a, b) => a + b, 0) / 3;
    const lowest = Math.min(...needs);
    const lowName = ["hunger", "happiness", "energy"][
      [pet.hunger, pet.happiness, pet.energy].indexOf(lowest)];
    if (lowest <= 0) return { emoji: "🆘", text: `${pet.name} desperately needs ${lowName}!` };
    if (lowest < 25) return { emoji: "😟", text: `${pet.name} really needs some ${lowName}.` };
    if (avg >= 85) return { emoji: "🌟", text: `${pet.name} is absolutely thriving!` };
    if (avg >= 60) return { emoji: "😊", text: `${pet.name} is happy and healthy.` };
    if (avg >= 35) return { emoji: "😐", text: `${pet.name} could use some attention.` };
    return { emoji: "😢", text: `${pet.name} is feeling neglected...` };
  }

  /* ---------- actions ---------- */
  function cooldownLeft(actionId) {
    return Math.max(0, (S.cooldowns[actionId] || 0) - Date.now());
  }
  function doAction(actionId) {
    const pet = activePet();
    if (!pet) return { ok: false, msg: "Adopt a pal first!" };
    tickAll();
    const def = PP.ACTIONS[actionId];
    const left = cooldownLeft(actionId);
    if (left > 0) return { ok: false, msg: `Wait ${Math.ceil(left / 1000)}s…` };
    if (pet[def.need] >= 95 && !def.energyCost) {
      return { ok: false, msg: `${pet.name}'s ${def.need} is already full!` };
    }
    if (def.energyCost && pet.energy < def.energyCost) {
      return { ok: false, msg: `${pet.name} is too tired to play — try a nap!` };
    }
    pet[def.need] = Math.min(100, pet[def.need] + def.amount);
    if (def.energyCost) pet.energy = Math.max(0, pet.energy - def.energyCost);

    const thriving = pet.hunger >= PP.THRIVING_THRESHOLD &&
                     pet.happiness >= PP.THRIVING_THRESHOLD &&
                     pet.energy >= PP.THRIVING_THRESHOLD;
    const coins = def.coins * (thriving ? PP.THRIVING_MULT : 1);
    S.coins += coins;
    const xpRes = addXp(pet, def.xp);
    S.cooldowns[actionId] = Date.now() + def.cooldownSec * 1000;
    pet.updatedAt = Date.now();
    save();

    const result = {
      ok: true,
      msg: def.text.replace("{name}", pet.name) + ` (+${coins} coins${thriving ? " — thriving bonus!" : ""})`,
      pet,
      leveled: !!xpRes.leveled,
      evolved: !!xpRes.evolved,
    };
    const ev = maybeEvent(pet);
    if (ev) result.event = ev;
    return result;
  }

  /* ---------- petting (tap the pet) ---------- */
  const PET_COOLDOWN_MS = 5000;
  const PET_HAPPINESS = 2;
  function petPet() {
    const pet = activePet();
    if (!pet) return { ok: false };
    tickAll();
    const now = Date.now();
    if (now - (S.lastPetAt || 0) < PET_COOLDOWN_MS) return { ok: false, cooled: true };
    S.lastPetAt = now;
    pet.happiness = Math.min(100, pet.happiness + PET_HAPPINESS);
    pet.updatedAt = now;
    save();
    return { ok: true, gained: PET_HAPPINESS };
  }

  function addXp(pet, amount) {
    pet.xp += amount;
    let leveled = false;
    while (pet.xp >= PP.xpForLevel(pet.level)) {
      pet.xp -= PP.xpForLevel(pet.level);
      pet.level += 1;
      leveled = true;
      S.gems += PP.LEVEL_GEM_REWARD;
    }
    if (leveled) {
      save();
      if (pet.level >= PP.EVOLVE_LEVEL && pet.stage === "baby") {
        pet.stage = "adult";
        save();
        return { evolved: true };
      }
      return { leveled: true };
    }
    save();
    return {};
  }

  /* ---------- surprise events (variable rewards — earned through play, never bought) ---------- */
  function maybeEvent(pet) {
    if (Math.random() > PP.EVENT_CHANCE) return null;
    const roll = Math.random();
    let msg;
    if (roll < 0.6) {
      const c = 5 + Math.floor(Math.random() * 11);
      S.coins += c; msg = `🎁 Surprise! ${pet.name} found ${c} coins behind the couch!`;
    } else if (roll < 0.85) {
      S.gems += 1; msg = `💎 Wow! ${pet.name} dug up a shiny gem! (+1 gem)`;
    } else {
      for (const n of ["hunger", "happiness", "energy"]) pet[n] = Math.min(100, pet[n] + 15);
      msg = `🍪 ${pet.name} shared a mystery snack with you! All needs +15.`;
    }
    save();
    return msg;
  }

  /* ---------- daily streak ---------- */
  function todayStr(d = new Date()) { return d.toISOString().slice(0, 10); }
  function checkStreak() {
    const today = todayStr();
    const last = S.streak.lastVisit;
    let awarded = 0, continued = false;
    if (last !== today) {
      const yesterday = todayStr(new Date(Date.now() - DAY));
      S.streak.count = (last === yesterday) ? Math.min(S.streak.count + 1, 99) : 1;
      S.streak.lastVisit = today;
      awarded = Math.min(S.streak.count, PP.STREAK_CAP_DAY) * PP.STREAK_COIN_PER_DAY;
      S.coins += awarded;
      continued = last === yesterday;
      save();
    }
    return { count: S.streak.count, awarded, continued };
  }

  /* ---------- shop ---------- */
  function buyCoinItem(itemId) {
    const pet = activePet();
    const item = PP.COIN_SHOP.find(i => i.id === itemId);
    if (!item || !pet) return { ok: false, msg: "Hmm, that didn't work." };
    tickAll();
    if (S.coins < item.cost) return { ok: false, msg: `Not enough coins! (need ${item.cost})` };
    if (item.effect.hat && pet.hat === item.effect.hat) return { ok: false, msg: `${pet.name} is already wearing that!` };
    S.coins -= item.cost;
    let msg;
    if (item.effect.need) {
      pet[item.effect.need] = Math.min(100, pet[item.effect.need] + item.effect.amount);
      msg = `${pet.name} enjoys the ${item.name}! (+${item.effect.amount} ${item.effect.need})`;
    } else if (item.effect.hat) {
      pet.hat = item.effect.hat;
      msg = `${pet.name} is rocking the ${item.name} ${item.effect.hat}`;
    }
    pet.updatedAt = Date.now();
    save();
    return { ok: true, msg };
  }
  function removeHat() {
    const pet = activePet();
    if (pet && pet.hat) { pet.hat = null; save(); return true; }
    return false;
  }
  function buyGemItem(itemId) {
    const pet = activePet();
    const item = PP.GEM_SHOP.find(i => i.id === itemId);
    if (!item) return { ok: false, msg: "Hmm, that didn't work." };
    if (S.gems < item.cost) return { ok: false, msg: `Not enough gems! (need ${item.cost} 💎)` };
    if (item.effect.slot && S.maxPets >= item.maxSlots) return { ok: false, msg: "You already have all pet slots!" };
    S.gems -= item.cost;
    let msg, needsRename = false;
    if (item.effect.slot) { S.maxPets += 1; msg = `🏠 New pet slot unlocked! You can now keep ${S.maxPets} pals.`; }
    if (item.effect.sitterDays) { S.sitterUntil = Date.now() + item.effect.sitterDays * DAY; msg = `🤝 Pet Sitter hired! Needs decay 50% slower for 7 days.`; }
    if (item.effect.background) { S.background = item.effect.background; msg = `✨ Your den is now golden and gorgeous!`; }
    if (item.effect.rename) { needsRename = true; msg = `✏️ Choose a new name for ${pet ? pet.name : "your pal"}:`; }
    save();
    return { ok: true, msg, needsRename };
  }
  function renamePet(petId, name) {
    const pet = petById(petId);
    name = (name || "").trim().slice(0, 14);
    if (!pet || !name) return false;
    pet.name = name; save(); return true;
  }
  function addGems(n) { S.gems += n; save(); }
  function switchPet(id) {
    if (petById(id)) { tickAll(); S.activePetId = id; save(); return true; }
    return false;
  }

  /* ---------- helpers for pages ---------- */
  const fmtTime = (ms) => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m";
    return Math.floor(m / 60) + "h " + (m % 60) + "m";
  };
  const canAdoptMore = () => S.pets.length < S.maxPets;

  return {
    state: () => S, save, tickAll, adopt, activePet, petById, speciesOf, displayName, artFor, videoFor,
    mood, doAction, petPet, cooldownLeft, checkStreak, buyCoinItem, buyGemItem, removeHat,
    renamePet, addGems, switchPet, fmtTime, canAdoptMore, todayStr,
  };
})();
