// tests/state.endTurn.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  endTurn,
} from "../assets/js/state.js";

const cfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5 };

test("endTurn flips activeIndex when sideIndex matches the active player", () => {
  let m = startMatch(cfg, 0);
  m = endTurn(m, 3000, 0);
  assert.equal(m.activeIndex, 1);
});

test("endTurn restores the previously active player's turnRemainingMs to full", () => {
  let m = startMatch(cfg, 0);
  // burn 4s of player 0's turn
  m = endTurn(m, 4000, 0);
  assert.equal(m.players[0].turnRemainingMs, 10_000);
});

test("endTurn preserves the previously active player's reserveRemainingMs (post-recompute)", () => {
  let m = startMatch(cfg, 0);
  // burn 13s → 3s consumed from reserve
  m = endTurn(m, 13_000, 0);
  assert.equal(m.players[0].reserveRemainingMs, 2000);
});

test("endTurn does not change the new active player's turnRemainingMs", () => {
  let m = startMatch(cfg, 0);
  const beforeP1 = m.players[1].turnRemainingMs;
  m = endTurn(m, 4000, 0);
  assert.equal(m.players[1].turnRemainingMs, beforeP1);
});

test("endTurn sets lastEndTurnAtPerfNow", () => {
  let m = startMatch(cfg, 0);
  m = endTurn(m, 3000, 0);
  assert.equal(m.lastEndTurnAtPerfNow, 3000);
});

test("endTurn within 150ms of previous accepted endTurn is a no-op (debounce)", () => {
  let m = startMatch(cfg, 0);
  m = endTurn(m, 3000, 0);
  const snapshot = JSON.stringify(m);
  const after = endTurn(m, 3050, 1); // 50ms later, even from the new active side
  assert.equal(JSON.stringify(after), snapshot);
});

test("endTurn called with sideIndex !== activeIndex is a no-op (inactive-side guard)", () => {
  let m = startMatch(cfg, 0);
  const snapshot = JSON.stringify(m);
  const after = endTurn(m, 3000, 1); // wrong side
  assert.equal(JSON.stringify(after), snapshot);
});

test("endTurn while paused is a no-op", () => {
  let m = startMatch(cfg, 0);
  m = { ...m, phase: "paused" };
  const snapshot = JSON.stringify(m);
  const after = endTurn(m, 3000, 0);
  assert.equal(JSON.stringify(after), snapshot);
});

test("endTurn after debounce window does flip", () => {
  let m = startMatch(cfg, 0);
  m = endTurn(m, 3000, 0); // P1 → P2
  m = endTurn(m, 3300, 1); // 300ms later, P2's turn ends → P1 again
  assert.equal(m.activeIndex, 0);
});
