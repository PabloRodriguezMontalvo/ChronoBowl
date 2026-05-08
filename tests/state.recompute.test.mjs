// tests/state.recompute.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  recompute,
} from "../assets/js/state.js";

const cfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5 };

test("recompute subtracts elapsed from active player's turnRemainingMs", () => {
  let m = startMatch(cfg, /* now */ 1000);
  m = recompute(m, 1000 + 3000); // +3s
  assert.equal(m.players[0].turnRemainingMs, 7000);
  assert.equal(m.players[0].reserveRemainingMs, 5000);
});

test("recompute spills overflow into reserveRemainingMs (two-tier subtraction)", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 13000); // 13s > 10s turn → 3s out of reserve
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 2000);
});

test("recompute floors both timers at 0 (no negative values)", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 999_999); // way past everything
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 0);
});

test("recompute resets turnStartedAtPerfNow so subsequent calls accumulate", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 2000);
  assert.equal(m.turnStartedAtPerfNow, 2000);
  m = recompute(m, 5000); // +3s more
  assert.equal(m.players[0].turnRemainingMs, 5000);
  assert.equal(m.turnStartedAtPerfNow, 5000);
});

test("recompute does not modify the inactive player's clocks", () => {
  let m = startMatch(cfg, 0);
  const beforeP1Turn = m.players[1].turnRemainingMs;
  const beforeP1Reserve = m.players[1].reserveRemainingMs;
  m = recompute(m, 7000);
  assert.equal(m.players[1].turnRemainingMs, beforeP1Turn);
  assert.equal(m.players[1].reserveRemainingMs, beforeP1Reserve);
});

test("recompute is a no-op when phase is not running", () => {
  let m = startMatch(cfg, 0);
  m = { ...m, phase: "paused", turnStartedAtPerfNow: null };
  const before = JSON.stringify(m);
  m = recompute(m, 5000);
  assert.equal(JSON.stringify(m), before);
});
