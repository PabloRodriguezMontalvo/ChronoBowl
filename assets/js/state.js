/**
 * state.js — pure state and reducers for Cronómetro Blood Bowl.
 * No DOM access. Imported by main.js and tested under node --test.
 *
 * See: specs/001-bloodbowl-timer/data-model.md
 */

const DEBOUNCE_END_TURN_MS = 150;

/** @returns {{schemaVersion:1, player1Name:string, player2Name:string, turnSeconds:number, reserveSeconds:number}} */
export function defaultConfig() {
  return {
    schemaVersion: 1,
    player1Name: "Player 1",
    player2Name: "Player 2",
    turnSeconds: 240,
    reserveSeconds: 0,
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
 * Returns a fresh idle Match (pre-start). Used as initial app state and
 * after `reset`. Both players start with full timers and full reserves.
 */
export function idleMatch(config) {
  return {
    phase: "idle",
    players: [
      makePlayer(config.player1Name || "Player 1", config.turnSeconds, config.reserveSeconds),
      makePlayer(config.player2Name || "Player 2", config.turnSeconds, config.reserveSeconds),
    ],
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
    players: [
      makePlayer(config.player1Name || "Player 1", config.turnSeconds, config.reserveSeconds),
      makePlayer(config.player2Name || "Player 2", config.turnSeconds, config.reserveSeconds),
    ],
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
  const fullTurnMs = match.config.turnSeconds * 1000;
  const newPlayers = recomputed.players.slice();
  newPlayers[recomputed.activeIndex] = {
    ...recomputed.players[recomputed.activeIndex],
    turnRemainingMs: fullTurnMs,
  };

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
 * Validate raw form input. Returns { config } on success, { error } on failure.
 */
export function validateConfig(raw) {
  const turnSeconds = Number(raw.turnSeconds);
  const reserveSeconds = Number(raw.reserveSeconds);

  if (!Number.isFinite(turnSeconds) || turnSeconds <= 0) {
    return { error: "El tiempo por turno debe ser un número mayor que 0." };
  }
  if (turnSeconds > 3600) {
    return { error: "El tiempo por turno no puede superar 3600 segundos (1 hora)." };
  }
  if (!Number.isFinite(reserveSeconds) || reserveSeconds < 0) {
    return { error: "El tiempo de reserva no puede ser negativo." };
  }
  if (reserveSeconds > 3600) {
    return { error: "El tiempo de reserva no puede superar 3600 segundos." };
  }

  const p1 = (raw.player1Name ?? "").toString().trim().slice(0, 24) || "Player 1";
  const p2 = (raw.player2Name ?? "").toString().trim().slice(0, 24) || "Player 2";

  return {
    config: {
      schemaVersion: 1,
      player1Name: p1,
      player2Name: p2,
      turnSeconds: Math.floor(turnSeconds),
      reserveSeconds: Math.floor(reserveSeconds),
    },
  };
}

function currentNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
