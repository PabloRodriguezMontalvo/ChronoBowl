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
    startBtn: document.getElementById("start-btn"),
    muteBtn: document.getElementById("mute-btn"),
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
    reserveLabels: Array.from(document.querySelectorAll(".reserve-label")),
    matchOverBanner: document.getElementById("match-over-banner"),
    matchOverText: document.getElementById("match-over-text"),
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

  // Hide reserve display in match-clock mode (FR-013).
  const isMatchClock = match.mode === "per-match";
  for (let i = 0; i < 2; i++) {
    d.reserve[i].hidden = isMatchClock;
  }
  for (const lbl of d.reserveLabels) lbl.hidden = isMatchClock;
  d.cards[0].classList.toggle("is-match-clock", isMatchClock);
  d.cards[1].classList.toggle("is-match-clock", isMatchClock);

  // Clock displays
  for (let i = 0; i < 2; i++) {
    d.turn[i].textContent = formatMs(match.players[i].turnRemainingMs);
    d.reserve[i].textContent = formatMs(match.players[i].reserveRemainingMs);
  }

  // Visual state per card
  for (let i = 0; i < 2; i++) {
    const isActive =
      i === match.activeIndex && match.phase !== "idle" && match.phase !== "ready" && match.phase !== "match-over";
    if (!isActive) {
      // In match-over phase, the card whose clock hit zero still gets the
      // exhausted treatment (FR-007).
      if (match.phase === "match-over" && match.players[i].turnRemainingMs === 0) {
        applyCardClasses(d.cards[i], [
          "is-active-exhausted",
          "animate__animated",
          "animate__shakeX",
          "animate__infinite",
        ]);
      } else {
        applyCardClasses(d.cards[i], ["is-inactive"]);
      }
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

  // Match-over banner (feature 004)
  const isMatchOver = match.phase === "match-over";
  if (d.matchOverBanner) {
    d.matchOverBanner.hidden = !isMatchOver;
    if (isMatchOver && d.matchOverText) {
      const exhaustedIdx = match.players.findIndex((p) => p.turnRemainingMs === 0);
      const exhaustedName = exhaustedIdx >= 0 ? match.players[exhaustedIdx].name : "";
      d.matchOverText.textContent = `¡Tiempo agotado para ${exhaustedName}!`;
    }
  }

  // Start vs Pause button visibility (phase 'ready' = pre-start)
  const isReady = match.phase === "ready";
  if (d.startBtn) d.startBtn.hidden = !isReady;
  d.pauseBtn.hidden = isReady || isMatchOver;

  // Mute toggle (feature 002)
  if (d.muteBtn) {
    const muted = Boolean(appState.muted);
    d.muteBtn.textContent = muted ? "🔇 Silencio" : "🔊 Sonido";
    d.muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  }
}
