// tests/state.matchClock.test.mjs
//
// Feature 004 reducer tests covering match-clock semantics:
//   - recompute: subtract from active clock only; reserve stays at 0;
//     transitions to "match-over" when active clock crosses zero.
//   - endTurn: no per-turn refill in per-match mode; freezes ending
//     player's clock at its current value; flips activeIndex.
//   - endTurn / pause are no-ops when phase === "match-over".

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  recompute,
  endTurn,
  pause,
} from "../assets/js/state.js";

const matchCfg = {
  ...defaultConfig(),
  mode: "per-match",
  matchSeconds: 60, // 60 s budget per player keeps the math obvious
};

test("(matchClock) recompute subtracts only from the active player's clock; reserve stays 0", () => {
  let m = startMatch(matchCfg, 0);
  assert.equal(m.players[0].turnRemainingMs, 60_000);
  assert.equal(m.players[0].reserveRemainingMs, 0);
  assert.equal(m.players[1].turnRemainingMs, 60_000);
  assert.equal(m.players[1].reserveRemainingMs, 0);

  m = recompute(m, 30_000); // 30 s elapsed
  assert.equal(m.players[0].turnRemainingMs, 30_000);
  assert.equal(m.players[0].reserveRemainingMs, 0); // never spills
  assert.equal(m.players[1].turnRemainingMs, 60_000);
  assert.equal(m.players[1].reserveRemainingMs, 0);
  assert.equal(m.phase, "running");
});

test("(matchClock) recompute transitions to match-over when active clock crosses zero", () => {
  let m = startMatch(matchCfg, 0);
  m = recompute(m, 75_000); // overshoot the 60 s budget
  assert.equal(m.phase, "match-over");
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 0);
  assert.equal(m.turnStartedAtPerfNow, null);
});

test("(matchClock) endTurn freezes the ending player's clock without refill", () => {
  let m = startMatch(matchCfg, 0);
  // Player 1 burns 20 s, then ends their turn.
  m = endTurn(m, 20_000, 0);
  assert.equal(m.activeIndex, 1);
  assert.equal(m.players[0].turnRemainingMs, 40_000); // frozen at 60-20
  assert.equal(m.players[1].turnRemainingMs, 60_000); // untouched
  assert.equal(m.players[0].reserveRemainingMs, 0);
});

test("(matchClock) endTurn after a previous endTurn correctly resumes the other player's clock", () => {
  let m = startMatch(matchCfg, 0);
  m = endTurn(m, 20_000, 0); // P1 → P2 (P1 has 40 s left)
  m = endTurn(m, 35_000, 1); // P2 turn lasted 15 s → P2 has 45 s left, P1 active again
  assert.equal(m.activeIndex, 0);
  assert.equal(m.players[1].turnRemainingMs, 45_000);
  assert.equal(m.players[0].turnRemainingMs, 40_000);
});

test("(matchClock) endTurn is a no-op when phase === match-over", () => {
  let m = startMatch(matchCfg, 0);
  m = recompute(m, 75_000); // → match-over
  const snapshot = JSON.stringify(m);
  const after = endTurn(m, 80_000, 0);
  assert.equal(JSON.stringify(after), snapshot);
});

test("(matchClock) pause is a no-op when phase === match-over", () => {
  let m = startMatch(matchCfg, 0);
  m = recompute(m, 75_000); // → match-over
  const snapshot = JSON.stringify(m);
  const after = pause(m, 80_000);
  assert.equal(JSON.stringify(after), snapshot);
});

test("(matchClock) per-turn mode is unaffected: endTurn still refills turnRemainingMs", () => {
  // SC-003 regression spot-check: per-turn config refills the ending
  // player's clock as before, even though endTurn is now mode-aware.
  const perTurnCfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5 };
  let m = startMatch(perTurnCfg, 0);
  m = endTurn(m, 4000, 0);
  assert.equal(m.players[0].turnRemainingMs, 10_000);
});
