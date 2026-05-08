/**
 * main.js — application entry point.
 * Wires storage + state + render + input.
 */

import {
  defaultConfig,
  idleMatch,
  startMatch,
  recompute,
  endTurn,
  pause as pauseAction,
  reset as resetAction,
  validateConfig,
  derivePlayerVisualStateDelta,
} from "./state.js";
import { render } from "./render.js";
import { installInput } from "./input.js";
import { loadConfig, saveConfig, clearConfig } from "./storage.js";
import { createAudio } from "./audio.js";

// ---------------------------------------------------------------------------
// App state — single mutable holder; reducers return new immutable matches.
// ---------------------------------------------------------------------------

const audio = createAudio();

const appState = {
  config: { ...defaultConfig(), ...loadConfig() },
  match: null,
  muted: audio.getMuted(),
};
appState.match = idleMatch(appState.config);
let prevMatch = appState.match;

function now() {
  return performance.now();
}

// ---------------------------------------------------------------------------
// Configuration form
// ---------------------------------------------------------------------------

const form = document.getElementById("config-form");
const nameInput1 = document.getElementById("cfg-name-1");
const nameInput2 = document.getElementById("cfg-name-2");
const turnInput = document.getElementById("cfg-turn-seconds");
const reserveInput = document.getElementById("cfg-reserve-seconds");
const matchInput = document.getElementById("cfg-match-seconds");
const modeRadios = Array.from(document.querySelectorAll('input[name="cfg-mode"]'));
const perTurnGroup = document.getElementById("cfg-per-turn-group");
const perMatchGroup = document.getElementById("cfg-per-match-group");
const errorEl = document.getElementById("cfg-error");
const clearBtn = document.getElementById("clear-config-btn");

function selectedMode() {
  const checked = modeRadios.find((r) => r.checked);
  return checked && checked.value === "per-match" ? "per-match" : "per-turn";
}

function applyModeVisibility() {
  const mode = selectedMode();
  perTurnGroup.hidden = mode !== "per-turn";
  perMatchGroup.hidden = mode !== "per-match";
}

function populateForm(config) {
  nameInput1.value = config.player1Name === "Player 1" ? "" : config.player1Name;
  nameInput2.value = config.player2Name === "Player 2" ? "" : config.player2Name;
  // Storage holds seconds; the form holds whole minutes (feature 003).
  // Math.round tolerates the (non-occurring in normal use) case of legacy
  // values that aren't exact multiples of 60.
  turnInput.value = String(Math.round((config.turnSeconds || 0) / 60));
  reserveInput.value = String(Math.round((config.reserveSeconds || 0) / 60));
  matchInput.value = String(Math.round((config.matchSeconds || 0) / 60));
  const mode = config.mode === "per-match" ? "per-match" : "per-turn";
  for (const r of modeRadios) r.checked = r.value === mode;
  applyModeVisibility();
}
populateForm(appState.config);

for (const r of modeRadios) {
  r.addEventListener("change", applyModeVisibility);
}

function readForm() {
  // Multiply by 60 to convert the form's minutes back to seconds before
  // handing the values to the validator. The validator picks per-turn vs.
  // per-match fields based on `mode`; the inactive mode's values pass
  // through so toggling preserves them.
  return {
    player1Name: nameInput1.value,
    player2Name: nameInput2.value,
    mode: selectedMode(),
    turnSeconds: Number(turnInput.value) * 60,
    reserveSeconds: Number(reserveInput.value) * 60,
    matchSeconds: Number(matchInput.value) * 60,
  };
}

function showError(msg) {
  if (msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateConfig(readForm());
  if (result.error) {
    showError(result.error);
    return;
  }
  showError(null);
  appState.config = result.config;
  saveConfig(appState.config);
  // Create the match in 'ready' phase: timers visible but not running.
  // The user clicks the Start button (audio unlock + actual run).
  appState.match = { ...idleMatch(appState.config), phase: "ready" };
  prevMatch = appState.match;
  render(appState);
});

clearBtn.addEventListener("click", () => {
  clearConfig();
  appState.config = defaultConfig();
  populateForm(appState.config);
  showError(null);
});

// ---------------------------------------------------------------------------
// Match controls
// ---------------------------------------------------------------------------

const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const startBtn = document.getElementById("start-btn");

function handleStart() {
  if (appState.match.phase !== "ready") return;
  appState.match = startMatch(appState.config, now());
  prevMatch = appState.match;
  audio.handleMatchStart();
  render(appState);
}

if (startBtn) startBtn.addEventListener("click", handleStart);

function handlePause() {
  appState.match = pauseAction(appState.match, now());
  render(appState);
}

function handleEndTurn(sideIndex) {
  const prev = appState.match;
  appState.match = endTurn(appState.match, now(), sideIndex);
  // If endTurn actually flipped the active player, reset cue flags so the
  // incoming player gets a fresh per-segment audio state.
  if (appState.match !== prev && appState.match.activeIndex !== prev.activeIndex) {
    audio.handleEndTurn();
  }
  prevMatch = appState.match;
  render(appState);
}

pauseBtn.addEventListener("click", handlePause);

resetBtn.addEventListener("click", () => {
  if (window.confirm("¿Reiniciar la partida?")) {
    appState.match = resetAction(appState.match, appState.config);
    prevMatch = appState.match;
    audio.handleReset();
    render(appState);
  }
});

const muteBtn = document.getElementById("mute-btn");
if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.getMuted());
    appState.muted = audio.getMuted();
    render(appState);
  });
}

installInput({
  onEndTurn: handleEndTurn,
  onPause: handlePause,
});

// ---------------------------------------------------------------------------
// Animation loop — recompute every frame while running, then render.
// ---------------------------------------------------------------------------

function tick() {
  if (appState.match.phase === "running") {
    appState.match = recompute(appState.match, now());
    const tags = derivePlayerVisualStateDelta(prevMatch, appState.match);
    if (tags.length) audio.fireForDelta(tags);
    prevMatch = appState.match;
  }
  render(appState);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Visibility handler: when returning to foreground, recompute once so
// the displayed time matches wall-clock (per FR-017).
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && appState.match.phase === "running") {
    appState.match = recompute(appState.match, now());
    const tags = derivePlayerVisualStateDelta(prevMatch, appState.match);
    if (tags.length) audio.fireForDelta(tags);
    prevMatch = appState.match;
    render(appState);
  }
});

// Initial paint
render(appState);

console.info("[bbtimer] ready");
