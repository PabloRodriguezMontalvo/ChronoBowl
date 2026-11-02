import {
  defaultConfig,
  idleMatch,
  readyMatch,
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.info("[bbtimer] service worker registered");
      })
      .catch((error) => {
        console.error("[bbtimer] service worker registration failed", error);
      });
  });
}

const audio = createAudio();

const appState = {
  match: idleMatch(loadConfig()),
  muted: audio.getMuted(),
};

const configForm = document.getElementById("config-form");
const configError = document.getElementById("cfg-error");
const clearConfigBtn = document.getElementById("clear-config-btn");
const muteBtn = document.getElementById("mute-btn");
const resetBtn = document.getElementById("reset-btn");
const pauseBtn = document.getElementById("pause-btn");
const startBtn = document.getElementById("start-btn");
const modeInputs = Array.from(document.querySelectorAll('input[name="cfg-mode"]'));
const perTurnGroup = document.getElementById("cfg-per-turn-group");
const perMatchGroup = document.getElementById("cfg-per-match-group");

function showFormError(message) {
  if (!configError) return;
  configError.textContent = message || "";
  configError.hidden = !message;
}

function syncModeFields() {
  const mode =
    document.querySelector('input[name="cfg-mode"]:checked')?.value === "per-match"
      ? "per-match"
      : "per-turn";
  if (perTurnGroup) perTurnGroup.hidden = mode === "per-match";
  if (perMatchGroup) perMatchGroup.hidden = mode !== "per-match";
}

function hydrateConfigForm(config) {
  const p1 = document.getElementById("cfg-name-1");
  const p2 = document.getElementById("cfg-name-2");
  const turnMinutes = document.getElementById("cfg-turn-seconds");
  const reserveMinutes = document.getElementById("cfg-reserve-seconds");
  const matchMinutes = document.getElementById("cfg-match-seconds");

  if (p1) p1.value = config.player1Name ?? "Player 1";
  if (p2) p2.value = config.player2Name ?? "Player 2";
  if (turnMinutes) turnMinutes.value = String(Math.round((config.turnSeconds ?? 240) / 60));
  if (reserveMinutes) reserveMinutes.value = String(Math.round((config.reserveSeconds ?? 300) / 60));
  if (matchMinutes) matchMinutes.value = String(Math.round((config.matchSeconds ?? 4500) / 60));

  const modeInput = document.querySelector(`input[name="cfg-mode"][value="${config.mode ?? "per-turn"}"]`);
  if (modeInput) modeInput.checked = true;

  syncModeFields();
  showFormError("");
}

function readFormConfig() {
  const player1Name = document.getElementById("cfg-name-1")?.value ?? "Player 1";
  const player2Name = document.getElementById("cfg-name-2")?.value ?? "Player 2";
  const mode = document.querySelector('input[name="cfg-mode"]:checked')?.value === "per-match" ? "per-match" : "per-turn";
  const turnMinutes = Number(document.getElementById("cfg-turn-seconds")?.value ?? 4);
  const reserveMinutes = Number(document.getElementById("cfg-reserve-seconds")?.value ?? 5);
  const matchMinutes = Number(document.getElementById("cfg-match-seconds")?.value ?? 75);

  return {
    player1Name,
    player2Name,
    mode,
    turnSeconds: Number.isFinite(turnMinutes) ? turnMinutes * 60 : 240,
    reserveSeconds: Number.isFinite(reserveMinutes) ? reserveMinutes * 60 : 300,
    matchSeconds: Number.isFinite(matchMinutes) ? matchMinutes * 60 : 4500,
  };
}

function prepareSelectedMatch(config) {
  const validation = validateConfig(config);
  if (validation.error) {
    showFormError(validation.error);
    return;
  }

  saveConfig(validation.config);
  appState.match = readyMatch(validation.config);
  appState.muted = audio.getMuted();
  render(appState);
}

function resetAppToIdle() {
  const config = loadConfig();
  appState.match = idleMatch(config);
  appState.muted = audio.getMuted();
  hydrateConfigForm(config);
  render(appState);
}

function handlePauseToggle() {
  if (appState.match.phase !== "running" && appState.match.phase !== "paused") return;
  appState.match = pauseAction(appState.match, performance.now());
  render(appState);
}

function handleResetMatch() {
  appState.match = resetAction(appState.match, appState.match.config);
  render(appState);
}

modeInputs.forEach((input) => {
  input.addEventListener("change", syncModeFields);
});

if (configForm) {
  configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    prepareSelectedMatch(readFormConfig());
  });
}

if (clearConfigBtn) {
  clearConfigBtn.addEventListener("click", () => {
    clearConfig();
    resetAppToIdle();
  });
}

if (pauseBtn) {
  pauseBtn.addEventListener("click", handlePauseToggle);
}

if (resetBtn) {
  resetBtn.addEventListener("click", handleResetMatch);
}

if (startBtn) {
  startBtn.addEventListener("click", () => {
    if (appState.match.phase !== "ready") return;
    appState.match = startMatch(appState.match.config, performance.now());
    appState.muted = audio.getMuted();
    audio.handleMatchStart();
    render(appState);
  });
}

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const muted = !audio.getMuted();
    audio.setMuted(muted);
    appState.muted = muted;
    render(appState);
  });
}

installInput({
  onEndTurn: (sideIndex) => {
    if (appState.match.phase !== "running") return;
    const previous = appState.match;
    const next = endTurn(previous, performance.now(), sideIndex);
    if (next === previous) return;

    const delta = derivePlayerVisualStateDelta(previous, next);
    appState.match = next;
    audio.fireForDelta(delta);
    render(appState);
  },
  onPause: handlePauseToggle,
});

hydrateConfigForm(loadConfig());
render(appState);

function tick(now) {
  if (appState.match.phase === "running") {
    const previous = appState.match;
    const next = recompute(previous, now);
    if (next !== previous) {
      const delta = derivePlayerVisualStateDelta(previous, next);
      appState.match = next;
      audio.fireForDelta(delta);
    }
  }

  render(appState);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
