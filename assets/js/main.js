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
} from "./state.js";
import { render } from "./render.js";
import { installInput } from "./input.js";
import { loadConfig, saveConfig, clearConfig } from "./storage.js";

// ---------------------------------------------------------------------------
// App state — single mutable holder; reducers return new immutable matches.
// ---------------------------------------------------------------------------

const appState = {
  config: { ...defaultConfig(), ...loadConfig() },
  match: null,
};
appState.match = idleMatch(appState.config);

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
const errorEl = document.getElementById("cfg-error");
const clearBtn = document.getElementById("clear-config-btn");

function populateForm(config) {
  nameInput1.value = config.player1Name === "Player 1" ? "" : config.player1Name;
  nameInput2.value = config.player2Name === "Player 2" ? "" : config.player2Name;
  turnInput.value = String(config.turnSeconds);
  reserveInput.value = String(config.reserveSeconds);
}
populateForm(appState.config);

function readForm() {
  return {
    player1Name: nameInput1.value,
    player2Name: nameInput2.value,
    turnSeconds: turnInput.value,
    reserveSeconds: reserveInput.value,
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
  appState.match = startMatch(appState.config, now());
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

function handlePause() {
  appState.match = pauseAction(appState.match, now());
  render(appState);
}

function handleEndTurn(sideIndex) {
  appState.match = endTurn(appState.match, now(), sideIndex);
  render(appState);
}

pauseBtn.addEventListener("click", handlePause);

resetBtn.addEventListener("click", () => {
  if (window.confirm("¿Reiniciar la partida?")) {
    appState.match = resetAction(appState.match, appState.config);
    render(appState);
  }
});

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
    render(appState);
  }
});

// Initial paint
render(appState);

console.info("[bbtimer] ready");
