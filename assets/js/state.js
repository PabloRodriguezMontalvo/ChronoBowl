/**
 * state.js — pure state and reducers for Cronómetro Blood Bowl.
 * No DOM access. Imported by main.js and tested under node --test.
 *
 * See: specs/001-bloodbowl-timer/data-model.md
 */

const DEBOUNCE_END_TURN_MS = 150;

/** @returns {{schemaVersion:1, player1Name:string, player2Name:string, mode:"per-turn"|"per-match", turnSeconds:number, reserveSeconds:number, matchSeconds:number}} */
export function defaultConfig() {
  return {
    schemaVersion: 1,
    player1Name: "Player 1",
    player2Name: "Player 2",
    mode: "per-turn",
    turnSeconds: 240,
    reserveSeconds: 300,
    matchSeconds: 4500,
  };
}

function makePlayer(name, turnSeconds, reserveSeconds) {
  return {
    name,
    turnRemainingMs: turnSeconds * 1000,
    reserveRemainingMs: reserveSeconds * 1000,
  };
}

/**
 * Build the two players for a Match given the config. In match-clock mode
 * each player's `turnRemainingMs` is seeded from `matchSeconds` and the
 * reserve is fixed at zero (R-001).
 */
function buildPlayers(config) {
  if (config.mode === "per-match") {
    const matchSec = Number(config.matchSeconds) || 0;
    return [
      makePlayer(config.player1Name || "Player 1", matchSec, 0),
      makePlayer(config.player2Name || "Player 2", matchSec, 0),
    ];
  }
  return [
    makePlayer(config.player1Name || "Player 1", config.turnSeconds, config.reserveSeconds),
    makePlayer(config.player2Name || "Player 2", config.turnSeconds, config.reserveSeconds),
  ];
}

/**
 * Returns a fresh idle Match (pre-start). Used as initial app state and
 * after `reset`. Both players start with full timers and full reserves.
 */
export function idleMatch(config) {
  return {
    phase: "idle",
    mode: config.mode === "per-match" ? "per-match" : "per-turn",
    players: buildPlayers(config),
    activeIndex: 0,
    turnStartedAtPerfNow: null,
    lastEndTurnAtPerfNow: null,
    config,
  };
}

/**
 * Start a fresh running match. `now` is injectable for tests; falls back to
 * `performance.now()` in the browser.
 */
export function startMatch(config, now = currentNow()) {
  return {
    phase: "running",
    mode: config.mode === "per-match" ? "per-match" : "per-turn",
    players: buildPlayers(config),
    activeIndex: 0,
    turnStartedAtPerfNow: now,
    lastEndTurnAtPerfNow: null,
    config,
  };
}

/**
 * Subtract elapsed time from the active player's clocks (two-tier:
 * turn timer first, then overflow into reserve, both floored at 0).
 * Resets `turnStartedAtPerfNow` to `now` so subsequent calls accumulate
 * correctly. No-op when phase !== "running".
 */
export function recompute(match, now) {
  if (match.phase !== "running") return match;
  if (match.turnStartedAtPerfNow == null) return match;

  const elapsed = Math.max(0, now - match.turnStartedAtPerfNow);
  if (elapsed === 0) return match;

  const active = match.players[match.activeIndex];
  let turnRem = active.turnRemainingMs - elapsed;
  let reserveRem = active.reserveRemainingMs;

  if (turnRem < 0) {
    reserveRem = Math.max(0, reserveRem + turnRem); // turnRem is negative → subtract overflow
    turnRem = 0;
  }

  const newPlayers = match.players.slice();
  newPlayers[match.activeIndex] = {
    ...active,
    turnRemainingMs: turnRem,
    reserveRemainingMs: reserveRem,
  };

  // Feature 004: in match-clock mode, the active clock crossing zero ends
  // the match. `reserveRem` is always 0 in this mode by construction, so
  // testing turnRem alone is sufficient.
  if (match.mode === "per-match" && turnRem === 0) {
    return {
      ...match,
      phase: "match-over",
      players: newPlayers,
      turnStartedAtPerfNow: null,
    };
  }

  return {
    ...match,
    players: newPlayers,
    turnStartedAtPerfNow: now,
  };
}

/**
 * End the current turn. Rejects (returns the match unchanged) if:
 *  - phase !== "running"
 *  - sideIndex !== match.activeIndex (input came from the inactive player)
 *  - within DEBOUNCE_END_TURN_MS of the last accepted endTurn
 * Otherwise: recompute first, restore the previously active player's
 * turn timer to full, flip activeIndex, set turnStartedAtPerfNow = now.
 */
export function endTurn(match, now, sideIndex) {
  if (match.phase !== "running") return match;
  if (sideIndex !== match.activeIndex) return match;
  if (
    match.lastEndTurnAtPerfNow != null &&
    now - match.lastEndTurnAtPerfNow < DEBOUNCE_END_TURN_MS
  ) {
    return match;
  }

  const recomputed = recompute(match, now);
  // If recompute already ended the match (per-match mode flag-fall),
  // honor that; do not flip to the other player.
  if (recomputed.phase === "match-over") return recomputed;

  const newPlayers = recomputed.players.slice();
  // Per-turn mode: refill the ending player's turn timer to full.
  // Per-match mode: freeze the ending player's clock at its current value.
  if (recomputed.mode !== "per-match") {
    const fullTurnMs = match.config.turnSeconds * 1000;
    newPlayers[recomputed.activeIndex] = {
      ...recomputed.players[recomputed.activeIndex],
      turnRemainingMs: fullTurnMs,
    };
  }

  return {
    ...recomputed,
    players: newPlayers,
    activeIndex: recomputed.activeIndex === 0 ? 1 : 0,
    turnStartedAtPerfNow: now,
    lastEndTurnAtPerfNow: now,
  };
}

/**
 * Toggle pause/resume. While running, recompute first then freeze.
 * While paused, resume from the same player at `now`. No-op otherwise.
 */
export function pause(match, now) {
  if (match.phase === "running") {
    const recomputed = recompute(match, now);
    return {
      ...recomputed,
      phase: "paused",
      turnStartedAtPerfNow: null,
    };
  }
  if (match.phase === "paused") {
    return {
      ...match,
      phase: "running",
      turnStartedAtPerfNow: now,
    };
  }
  return match;
}

/**
 * Reset the match to idle, with both players' timers and reserves restored
 * from the supplied config. Names and config are preserved.
 */
export function reset(_match, config) {
  return idleMatch(config);
}

/**
 * Derived state for visual rendering. Not stored; recomputed each frame.
 * @returns {"normal" | "in_reserve" | "exhausted"}
 */
export function playerVisualState(player) {
  if (player.turnRemainingMs > 0) return "normal";
  if (player.reserveRemainingMs > 0) return "in_reserve";
  return "exhausted";
}

/**
 * Pure helper (feature 002): compare two consecutive match snapshots and
 * return the audio-cue tags that fired in the transition. See
 * specs/002-turn-sounds/data-model.md.
 *
 * - Each player can emit at most one tag per call.
 * - Order: p1 first, then p2.
 * - "Backwards" transitions (e.g. exhausted→normal after reset) emit nothing;
 *   the audio module clears its already-played flags via lifecycle hooks.
 *
 * @returns {string[]} subset of
 *   "p1:enteredReserve" | "p1:enteredExhausted" | "p2:enteredReserve" | "p2:enteredExhausted"
 */
export function derivePlayerVisualStateDelta(prevMatch, nextMatch) {
  const out = [];
  if (!prevMatch || !nextMatch) return out;
  for (let i = 0; i < 2; i++) {
    const prevPlayer = prevMatch.players?.[i];
    const nextPlayer = nextMatch.players?.[i];
    if (!prevPlayer || !nextPlayer) continue;
    const prev = playerVisualState(prevPlayer);
    const next = playerVisualState(nextPlayer);
    if (prev === next) continue;
    const prefix = `p${i + 1}`;
    if (next === "in_reserve" && prev === "normal") {
      out.push(`${prefix}:enteredReserve`);
    } else if (next === "exhausted" && (prev === "in_reserve" || prev === "normal")) {
      // Includes the background-skip case (normal → exhausted) where we
      // collapse to a single "exhausted" tag and skip "enteredReserve".
      out.push(`${prefix}:enteredExhausted`);
    }
    // Any other transition (backwards via reset, etc.) is intentionally ignored.
  }
  return out;
}

/**
 * Validate raw form input. Returns { config } on success, { error } on failure.
 *
 * The validator continues to operate in seconds (the persisted unit). The form
 * layer in main.js multiplies the user's minute input by 60 before calling
 * this function and divides by 60 when populating the form. Error messages
 * therefore refer to **minutes** because that is what the user sees.
 *
 * Mode-aware (feature 004): when `raw.mode === "per-match"` validates
 * `matchSeconds` (1–180 min, multiple of 60); otherwise validates the
 * existing per-turn fields. Inactive-mode fields pass through using
 * defaults when missing so toggling preserves them across persistence.
 */
export function validateConfig(raw) {
  const mode = raw.mode === "per-match" ? "per-match" : "per-turn";
  const p1 = (raw.player1Name ?? "").toString().trim().slice(0, 24) || "Player 1";
  const p2 = (raw.player2Name ?? "").toString().trim().slice(0, 24) || "Player 2";

  if (mode === "per-match") {
    const matchSeconds = Number(raw.matchSeconds);
    if (!Number.isFinite(matchSeconds)) {
      return { error: "El tiempo por jugador debe ser un número entero positivo de minutos." };
    }
    if (matchSeconds <= 0) {
      return { error: "El tiempo por jugador debe ser al menos 1 minuto." };
    }
    if (matchSeconds > 10800) {
      return { error: "El tiempo por jugador no puede superar 180 minutos." };
    }
    if (matchSeconds % 60 !== 0) {
      return { error: "Introduce un número entero de minutos." };
    }
    // Pass through the inactive mode's values (using defaults when missing)
    // so switching modes does not destroy the user's other-mode settings.
    const turnSecondsRaw = Number(raw.turnSeconds);
    const reserveSecondsRaw = Number(raw.reserveSeconds);
    const turnSeconds = Number.isFinite(turnSecondsRaw) && turnSecondsRaw > 0 ? Math.floor(turnSecondsRaw) : 240;
    const reserveSeconds = Number.isFinite(reserveSecondsRaw) && reserveSecondsRaw >= 0 ? Math.floor(reserveSecondsRaw) : 300;
    return {
      config: {
        schemaVersion: 1,
        player1Name: p1,
        player2Name: p2,
        mode: "per-match",
        turnSeconds,
        reserveSeconds,
        matchSeconds: Math.floor(matchSeconds),
      },
    };
  }

  const turnSeconds = Number(raw.turnSeconds);
  const reserveSeconds = Number(raw.reserveSeconds);

  if (!Number.isFinite(turnSeconds)) {
    return { error: "El tiempo por turno debe ser un número entero positivo de minutos." };
  }
  if (turnSeconds <= 0) {
    return { error: "El tiempo por turno debe ser al menos 1 minuto." };
  }
  if (turnSeconds > 3600) {
    return { error: "El tiempo por turno no puede superar 60 minutos." };
  }
  if (!Number.isFinite(reserveSeconds) || reserveSeconds < 0) {
    return { error: "El tiempo de reserva no puede ser negativo." };
  }
  if (reserveSeconds > 3600) {
    return { error: "El tiempo de reserva no puede superar 60 minutos." };
  }
  // Integer-minute guard. The form-layer adapter multiplies whole minutes by
  // 60, so any non-multiple-of-60 here means the user typed a fractional
  // value (e.g. "1.5") that bypassed the input's step="1".
  if (turnSeconds % 60 !== 0 || reserveSeconds % 60 !== 0) {
    return { error: "Introduce un número entero de minutos." };
  }

  // Pass through match-clock value (defaulting if missing) so toggling modes
  // doesn't lose the user's previous match-clock setting.
  const matchSecondsRaw = Number(raw.matchSeconds);
  const matchSeconds = Number.isFinite(matchSecondsRaw) && matchSecondsRaw > 0 ? Math.floor(matchSecondsRaw) : 4500;

  return {
    config: {
      schemaVersion: 1,
      player1Name: p1,
      player2Name: p2,
      mode: "per-turn",
      turnSeconds: Math.floor(turnSeconds),
      reserveSeconds: Math.floor(reserveSeconds),
      matchSeconds,
    },
  };
}

function currentNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
