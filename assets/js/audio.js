/**
 * audio.js — feature 002 turn-transition sound cues.
 *
 * Owns:
 *   - two preloaded HTMLAudioElement instances (one per cue)
 *   - the per-(player, cue) "already triggered" flags
 *   - the persisted mute preference
 *
 * Pure helpers in state.js compute the delta tags; this module fires the
 * matching cue exactly once per transition. See contracts/audio-contract.md.
 */

import { loadAudioPrefs as defaultLoad, saveAudioPrefs as defaultSave } from "./storage.js";

const TAGS = [
  "p1:enteredReserve",
  "p1:enteredExhausted",
  "p2:enteredReserve",
  "p2:enteredExhausted",
];

const CUE_DEFINITIONS = [
  { id: "enterReserve", src: "./assets/audio/enter-reserve.wav", volume: 0.5 },
  { id: "exhausted", src: "./assets/audio/exhausted.wav", volume: 0.5 },
];

function tagToCueId(tag) {
  return tag.endsWith(":enteredReserve") ? "enterReserve" : "exhausted";
}

function freshTriggered() {
  const obj = {};
  for (const t of TAGS) obj[t] = false;
  return obj;
}

/**
 * Build a real DOM-backed playCue function. Returns a no-op fallback if
 * the Audio constructor or DOM is not available (e.g. in `node --test`).
 */
function buildBrowserPlayCue() {
  if (typeof Audio === "undefined") {
    return () => {};
  }
  const elements = {};
  for (const cue of CUE_DEFINITIONS) {
    try {
      const el = new Audio(cue.src);
      el.preload = "auto";
      el.volume = cue.volume;
      elements[cue.id] = el;
    } catch {
      // Construction failure shouldn't ever happen in modern browsers, but
      // we tolerate it silently per FR-010.
    }
  }
  return function playCue(cueId) {
    const el = elements[cueId];
    if (!el) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      // FR-010: never let audio failure break the timer loop.
    }
  };
}

/**
 * Factory. Both `playCue` and `prefs` are dependency-injected so that
 * tests can run under `node --test` without the DOM.
 *
 * @param {{ playCue?: (cueId:string)=>void, prefs?: { load: ()=>any, save: (p:any)=>void } }} [deps]
 */
export function createAudio(deps = {}) {
  const playCue = deps.playCue ?? buildBrowserPlayCue();
  const prefsAdapter = deps.prefs ?? { load: defaultLoad, save: defaultSave };

  let muted = false;
  try {
    const loaded = prefsAdapter.load();
    muted = Boolean(loaded?.muted);
  } catch {
    muted = false;
  }

  let unlocked = false;
  let triggered = freshTriggered();

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // Real-Audio path: fire a no-op play on each preloaded element so that
    // subsequent automated playbacks pass the browser's autoplay gate.
    // We only do this when the injected `playCue` is the production one;
    // tests injecting a fake never need unlock to do anything.
    if (deps.playCue) return;
    if (typeof Audio === "undefined") return;
    // Trigger a silent prime per cue. We can't easily reach the elements
    // map here without leaking the abstraction; instead, request each cue
    // once at zero volume by using a separate primer Audio. Cheap and
    // adequate for autoplay unlock.
    for (const cue of CUE_DEFINITIONS) {
      try {
        const primer = new Audio(cue.src);
        primer.volume = 0;
        const p = primer.play();
        if (p && typeof p.then === "function") {
          p.then(() => primer.pause()).catch(() => {});
        }
      } catch {
        /* swallow */
      }
    }
  }

  function fireForDelta(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return;
    if (muted) return;
    for (const tag of tags) {
      if (!Object.prototype.hasOwnProperty.call(triggered, tag)) continue;
      if (triggered[tag]) continue;
      triggered[tag] = true;
      try {
        playCue(tagToCueId(tag));
      } catch {
        /* FR-010 */
      }
    }
  }

  function clearAllFlags() {
    triggered = freshTriggered();
  }

  return {
    unlock,
    fireForDelta,
    handleEndTurn: clearAllFlags,
    handleReset: clearAllFlags,
    handleMatchStart() {
      clearAllFlags();
      unlock();
    },
    setMuted(next) {
      muted = Boolean(next);
      try {
        prefsAdapter.save({ schemaVersion: 1, muted });
      } catch {
        /* swallow */
      }
    },
    getMuted() {
      return muted;
    },
    // Exposed for diagnostics / tests only.
    _triggered: () => ({ ...triggered }),
  };
}
