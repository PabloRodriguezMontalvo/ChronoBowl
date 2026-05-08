// tests/state.reserve.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  recompute,
  endTurn,
  playerVisualState,
} from "../assets/js/state.js";

const cfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5 };

test("reserve: elapsed exactly equal to turn → turn 0, reserve unchanged", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 10_000);
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 5_000);
  assert.equal(playerVisualState(m.players[0]), "in_reserve");
});

test("reserve: elapsed > turn but < turn+reserve → turn 0, reserve reduced", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 12_500); // 2.5s into reserve
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 2_500);
  assert.equal(playerVisualState(m.players[0]), "in_reserve");
});

test("reserve: elapsed > turn+reserve → both 0, no negatives, exhausted state", () => {
  let m = startMatch(cfg, 0);
  m = recompute(m, 30_000);
  assert.equal(m.players[0].turnRemainingMs, 0);
  assert.equal(m.players[0].reserveRemainingMs, 0);
  assert.equal(playerVisualState(m.players[0]), "exhausted");
});

test("reserve: endTurn while in reserve resets only turn, preserves reduced reserve", () => {
  let m = startMatch(cfg, 0);
  m = endTurn(m, 12_500, 0); // 2.5s consumed from reserve
  assert.equal(m.players[0].turnRemainingMs, 10_000); // restored full
  assert.equal(m.players[0].reserveRemainingMs, 2_500); // preserved
  assert.equal(m.activeIndex, 1);
});

test("reserve = 0 → strict mode: turn at 0 is immediately exhausted", () => {
  const strict = { ...defaultConfig(), turnSeconds: 5, reserveSeconds: 0 };
  let m = startMatch(strict, 0);
  m = recompute(m, 5_000);
  assert.equal(playerVisualState(m.players[0]), "exhausted");
});

test("playerVisualState: normal | in_reserve | exhausted", () => {
  assert.equal(playerVisualState({ turnRemainingMs: 1, reserveRemainingMs: 0 }), "normal");
  assert.equal(playerVisualState({ turnRemainingMs: 0, reserveRemainingMs: 1 }), "in_reserve");
  assert.equal(playerVisualState({ turnRemainingMs: 0, reserveRemainingMs: 0 }), "exhausted");
});
