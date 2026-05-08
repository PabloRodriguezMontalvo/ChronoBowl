/**
 * storage.js — read/write the persisted Configuration in localStorage.
 * Schema per contracts/ui-contract.md §3.
 */

const STORAGE_KEY = "bbtimer.config.v1";
const SCHEMA_VERSION = 1;

/** @returns {{schemaVersion:number, player1Name:string, player2Name:string, turnSeconds:number, reserveSeconds:number}} */
export function defaultStoredConfig() {
  return {
    schemaVersion: SCHEMA_VERSION,
    player1Name: "Player 1",
    player2Name: "Player 2",
    turnSeconds: 240,
    reserveSeconds: 0,
  };
}

/**
 * Load configuration from localStorage. Falls back to defaults on any failure
 * (missing key, malformed JSON, missing fields, wrong schemaVersion).
 */
export function loadConfig() {
  if (typeof localStorage === "undefined") {
    return defaultStoredConfig();
  }

  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultStoredConfig();
  }
  if (!raw) return defaultStoredConfig();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultStoredConfig();
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.schemaVersion !== SCHEMA_VERSION ||
    typeof parsed.player1Name !== "string" ||
    typeof parsed.player2Name !== "string" ||
    typeof parsed.turnSeconds !== "number" ||
    typeof parsed.reserveSeconds !== "number"
  ) {
    return defaultStoredConfig();
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    player1Name: parsed.player1Name,
    player2Name: parsed.player2Name,
    turnSeconds: parsed.turnSeconds,
    reserveSeconds: parsed.reserveSeconds,
  };
}

/**
 * Persist a configuration. Best-effort: failures are swallowed (e.g., private
 * mode quotas) and reported in the console for debugging.
 */
export function saveConfig(config) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      player1Name: String(config.player1Name ?? "Player 1"),
      player2Name: String(config.player2Name ?? "Player 2"),
      turnSeconds: Number(config.turnSeconds),
      reserveSeconds: Number(config.reserveSeconds),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[bbtimer] could not persist config:", err);
  }
}

/** Explicit user-initiated clear, per contracts/ui-contract.md §3. */
export function clearConfig() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[bbtimer] could not clear config:", err);
  }
}

// ---------------------------------------------------------------------------
// Audio preferences (feature 002 — turn-sounds)
// Stored under a separate key so config and audio prefs evolve independently.
// ---------------------------------------------------------------------------

const AUDIO_KEY = "bbtimer.audio.v1";
const AUDIO_SCHEMA_VERSION = 1;

/** @returns {{schemaVersion:number, muted:boolean}} */
export function defaultAudioPrefs() {
  return { schemaVersion: AUDIO_SCHEMA_VERSION, muted: false };
}

/** Load audio prefs from localStorage. Falls back to defaults on any failure. */
export function loadAudioPrefs() {
  if (typeof localStorage === "undefined") return defaultAudioPrefs();
  let raw;
  try {
    raw = localStorage.getItem(AUDIO_KEY);
  } catch {
    return defaultAudioPrefs();
  }
  if (!raw) return defaultAudioPrefs();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultAudioPrefs();
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.schemaVersion !== AUDIO_SCHEMA_VERSION ||
    typeof parsed.muted !== "boolean"
  ) {
    return defaultAudioPrefs();
  }
  return { schemaVersion: AUDIO_SCHEMA_VERSION, muted: parsed.muted };
}

/** Persist audio prefs. Best-effort. */
export function saveAudioPrefs(prefs) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      muted: Boolean(prefs?.muted),
    };
    localStorage.setItem(AUDIO_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[bbtimer] could not persist audio prefs:", err);
  }
}
