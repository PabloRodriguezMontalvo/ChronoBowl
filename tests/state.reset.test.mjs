// tests/state.reset.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  recompute,
  reset,
} from "../assets/js/state.js";

const cfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5, player1Name: "Alice", player2Name: "Bob" };

test("reset returns idle match with both timers and reserves restored", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 7_500); // burn most of P1's turn
  m = reset(m, cfg);
  assert.equal(m.phase, "idle");
  assert.equal(m.players[0].turnRemainingMs, 10_000);
  assert.equal(m.players[1].turnRemainingMs, 10_000);
  assert.equal(m.players[0].reserveRemainingMs, 5_000);
  assert.equal(m.players[1].reserveRemainingMs, 5_000);
  assert.equal(m.activeIndex, 0);
  assert.equal(m.turnStartedAtPerfNow, null);
});

test("reset preserves the configured player names", () => {
  let m = startMatch(cfg, 0);
  m = reset(m, cfg);
  assert.equal(m.players[0].name, "Alice");
  assert.equal(m.players[1].name, "Bob");
});

test("reset does not mutate the input match", () => {
  const m = startMatch(cfg, 0);
  const snapshot = JSON.stringify(m);
  reset(m, cfg);
  assert.equal(JSON.stringify(m), snapshot);
});
