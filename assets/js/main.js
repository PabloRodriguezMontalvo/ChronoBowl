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

// ---------------------------------------------------------------------------
// App state — single mutable holder; reducers return new immutable matches.
// ---------------------------------------------------------------------------

const audio = createAudio();
