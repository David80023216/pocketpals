/* Pocket Pals — game data: species, shop items, tuning constants */
"use strict";

const PP = {
  /* ---------- Species ---------- */
  SPECIES: {
    ember: {
      babyName: "Ember Cub", adultName: "Ember Fox",
      element: "Fire",
      blurb: "A tiny fox kit with flames dancing on its ears and tail. Warms your heart — literally.",
      personality: "Playful and bold. Loves games more than naps.",
    },
    bloop: {
      babyName: "Bloop", adultName: "Tidebloom",
      element: "Water",
      blurb: "A squishy little droplet that giggles when it bounces. Basically a living water balloon.",
      personality: "Gentle and goofy. Easiest pal to keep happy.",
    },
    sprout: {
      babyName: "Sprout Pup", adultName: "Thorn Wolf",
      element: "Nature",
      blurb: "A leafy pup with a sprout on its head that blooms when it's truly happy.",
      personality: "Loyal and calm. Thrives on routine care.",
    },
    nimbus: {
      babyName: "Nimbus Kitten", adultName: "Stormwhisk",
      element: "Sky",
      blurb: "A kitten made of cloud fluff that rains tiny sparkles when excited.",
      personality: "Dreamy and curious. Gets sleepy faster than others.",
    },
    pebbles: {
      babyName: "Pebbles", adultName: "Stone Guardian",
      element: "Earth",
      blurb: "A round little rock golem with mossy patches. Slow to wake, impossible not to love.",
      personality: "Steady and chill. Needs decay a touch slower.",
    },
    zip: {
      babyName: "Zip", adultName: "Zipstorm",
      element: "Electric",
      blurb: "A speedy squirrel crackling with static. Do not touch during thunderstorms. (Kidding. Mostly.)",
      personality: "Hyper and hilarious. Burns energy fast, recharges fast.",
    },
  },
  SPECIES_ORDER: ["ember", "bloop", "sprout", "nimbus", "pebbles", "zip"],

  /* ---------- Tuning ---------- */
  DECAY_PER_HOUR: { hunger: 9, happiness: 7, energy: 6 }, // needs lost per hour
  INACTIVE_DECAY_MULT: 0.5,   // pets that aren't active decay slower
  SITTER_DECAY_MULT: 0.5,     // Pet Sitter perk
  PEBBLES_DECAY_MULT: 0.85,   // pebbles is extra chill

  ACTIONS: {
    feed: { emoji: "🍖", label: "Feed", need: "hunger", amount: 30, xp: 2, coins: 3, cooldownSec: 45,
            text: "Yum! {name} munches happily." },
    play: { emoji: "🎾", label: "Play", need: "happiness", amount: 30, energyCost: 12, xp: 2, coins: 3, cooldownSec: 45,
            text: "{name} zooms around with joy!" },
    nap:  { emoji: "😴", label: "Nap", need: "energy", amount: 35, xp: 1, coins: 2, cooldownSec: 60,
            text: "{name} curls up for a cozy nap. Shhh..." },
  },
  THRIVING_THRESHOLD: 75,  // all needs >= this -> double coin rewards
  THRIVING_MULT: 2,

  xpForLevel: (level) => level * 30,  // XP needed to go from `level` to `level+1`
  EVOLVE_LEVEL: 5,                    // Baby -> Adult at this level
  LEVEL_GEM_REWARD: 2,

  EVENT_CHANCE: 0.18, // chance of a surprise gift after an action

  STREAK_COIN_PER_DAY: 10,
  STREAK_CAP_DAY: 7,

  /* ---------- Coin shop ---------- */
  COIN_SHOP: [
    { id: "berry", emoji: "🫐", name: "Berry Snack", cost: 15, desc: "+25 Hunger instantly", effect: { need: "hunger", amount: 25 } },
    { id: "toy", emoji: "🧸", name: "Squeaky Toy", cost: 25, desc: "+25 Happiness instantly", effect: { need: "happiness", amount: 25 } },
    { id: "pillow", emoji: "☁️", name: "Cloud Pillow", cost: 25, desc: "+25 Energy instantly", effect: { need: "energy", amount: 25 } },
    { id: "partyhat", emoji: "🎉", name: "Party Hat", cost: 60, desc: "A festive look for your pal", effect: { hat: "🎉" } },
    { id: "shades", emoji: "🕶️", name: "Cool Shades", cost: 120, desc: "Maximum chill", effect: { hat: "🕶️" } },
    { id: "crown", emoji: "👑", name: "Royal Crown", cost: 200, desc: "For the most regal of pals", effect: { hat: "👑" } },
  ],

  /* ---------- Gem shop (deterministic perks only — gems never buy randomness) ---------- */
  GEM_SHOP: [
    { id: "slot2", emoji: "🏠", name: "Extra Pet Slot", cost: 60, desc: "Adopt a 2nd pal (then a 3rd with another slot)", effect: { slot: 1 }, repeatable: true, maxSlots: 3 },
    { id: "sitter", emoji: "🤝", name: "Pet Sitter — 7 days", cost: 40, desc: "Needs decay 50% slower for a week", effect: { sitterDays: 7 } },
    { id: "golden", emoji: "✨", name: "Golden Den", cost: 25, desc: "A shimmering golden background for your pal", effect: { background: "golden" } },
    { id: "rename", emoji: "✏️", name: "Name Change", cost: 10, desc: "Give your pal a brand-new name", effect: { rename: true } },
  ],

  /* ---------- Gem packages (real money via Stripe — configure links in store.js) ---------- */
  GEM_PACKS: [
    { id: "gems100", gems: 100, price: "$0.99", blurb: "A little treat" },
    { id: "gems550", gems: 550, price: "$3.99", blurb: "Most popular" },
    { id: "gems1500", gems: 1500, price: "$9.99", blurb: "Best value" },
  ],
};
