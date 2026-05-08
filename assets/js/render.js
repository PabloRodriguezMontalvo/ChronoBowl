/**
 * render.js — DOM updates only. No state mutations, no logic.
 * Reads appState and writes to the cached DOM nodes.
 */

import { playerVisualState } from "./state.js";

let cached = null;

/** Cache DOM lookups once. */
function dom() {
  if (cached) return cached;
  cached = {
    body: document.body,
    configScreen: document.getElementById("config-screen"),
    matchScreen: document.getElementById("match-screen"),
    pausedBanner: document.getElementById("paused-banner"),
    pauseBtn: document.getElementById("pause-btn"),
    cards: [
      document.getElementById("player-1-card"),
      document.getElementById("player-2-card"),
    ],
    names: [
      document.getElementById("player-1-name"),
      document.getElementById("player-2-name"),
    ],
    turn: [
      document.getElementById("player-1-turn"),
      document.getElementById("player-2-turn"),
    ],
    reserve: [
      document.getElementById("player-1-reserve"),
      document.getElementById("player-2-reserve"),
    ],
  };
  return cached;
}

function formatMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATE_CLASSES = [
  "is-inactive",
  "is-active-normal",
  "is-active-in-reserve",
  "is-active-exhausted",
  "animate__animated",
  "animate__pulse",
  "animate__shakeX",
  "animate__infinite",
];

function applyCardClasses(cardEl, classes) {
  for (const c of STATE_CLASSES) cardEl.classList.remove(c);
  for (const c of classes) cardEl.classList.add(c);
}

export function render(appState) {
  const d = dom();
  const { match } = appState;

  // Screen visibility
  if (match.phase === "idle") {
    d.configScreen.hidden = false;
    d.matchScreen.hidden = true;
    d.body.classList.remove("is-paused");
    d.pausedBanner.hidden = true;
    return;
  }
  d.configScreen.hidden = true;
  d.matchScreen.hidden = false;

  // Names
  d.names[0].textContent = match.players[0].name;
  d.names[1].textContent = match.players[1].name;

  // Clock displays
  for (let i = 0; i < 2; i++) {
    d.turn[i].textContent = formatMs(match.players[i].turnRemainingMs);
    d.reserve[i].textContent = formatMs(match.players[i].reserveRemainingMs);
  }

  // Visual state per card
  for (let i = 0; i < 2; i++) {
    const isActive = i === match.activeIndex && match.phase !== "idle";
    if (!isActive) {
      applyCardClasses(d.cards[i], ["is-inactive"]);
      continue;
    }
    const vs = playerVisualState(match.players[i]);
    if (vs === "normal") {
      applyCardClasses(d.cards[i], [
        "is-active-normal",
        "animate__animated",
        "animate__pulse",
        "animate__infinite",
      ]);
    } else if (vs === "in_reserve") {
      applyCardClasses(d.cards[i], [
        "is-active-in-reserve",
        "animate__animated",
        "animate__pulse",
        "animate__infinite",
      ]);
    } else {
      applyCardClasses(d.cards[i], [
        "is-active-exhausted",
        "animate__animated",
        "animate__shakeX",
        "animate__infinite",
      ]);
    }
  }

  // Paused state
  const isPaused = match.phase === "paused";
  d.body.classList.toggle("is-paused", isPaused);
  d.pausedBanner.hidden = !isPaused;
  d.pauseBtn.textContent = isPaused ? "▶ Reanudar" : "⏸ Pausa";
}
