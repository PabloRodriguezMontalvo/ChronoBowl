// tests/state.validateConfig.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateConfig } from "../assets/js/state.js";

const base = (over = {}) => ({
  player1Name: "Alice",
  player2Name: "Bob",
  turnSeconds: 240,
  reserveSeconds: 300,
  ...over,
});

test("(a) accepts a valid 4-min/5-min config and preserves seconds", () => {
  const r = validateConfig(base());
  assert.equal(r.error, undefined);
  assert.equal(r.config.turnSeconds, 240);
  assert.equal(r.config.reserveSeconds, 300);
  assert.equal(r.config.player1Name, "Alice");
  assert.equal(r.config.player2Name, "Bob");
});

test("(b) rejects turn 0 with a message mentioning '1 minuto'", () => {
  const r = validateConfig(base({ turnSeconds: 0, reserveSeconds: 0 }));
  assert.ok(r.error, "expected an error");
  assert.match(r.error, /1 minuto/);
  assert.doesNotMatch(r.error, /segundos/i);
});

test("(c) rejects negative turn with a minute-worded message (no segundos)", () => {
  const r = validateConfig(base({ turnSeconds: -60, reserveSeconds: 0 }));
  assert.ok(r.error);
  assert.match(r.error, /minuto/);
  assert.doesNotMatch(r.error, /segundos/i);
});

test("(d) rejects turn=90 (not a whole minute) with the integer-minutes error", () => {
  const r = validateConfig(base({ turnSeconds: 90, reserveSeconds: 0 }));
  assert.ok(r.error);
  assert.match(r.error, /n[uú]mero entero de minutos/i);
});

test("(e) rejects reserve=30 (not a whole minute) with the integer-minutes error", () => {
  const r = validateConfig(base({ turnSeconds: 240, reserveSeconds: 30 }));
  assert.ok(r.error);
  assert.match(r.error, /n[uú]mero entero de minutos/i);
});

test("(f) rejects turn 4200 (>60 min) with a 60-minute upper-bound message", () => {
  const r = validateConfig(base({ turnSeconds: 4200, reserveSeconds: 0 }));
  assert.ok(r.error);
  assert.match(r.error, /60 minutos/);
  assert.doesNotMatch(r.error, /3600/);
});

test("(g) accepts 1-minute strict mode (turn=60, reserve=0)", () => {
  const r = validateConfig(base({ turnSeconds: 60, reserveSeconds: 0 }));
  assert.equal(r.error, undefined);
  assert.equal(r.config.turnSeconds, 60);
  assert.equal(r.config.reserveSeconds, 0);
});

test("(h) rejects non-numeric turn (NaN) with the 'número entero positivo' message", () => {
  const r = validateConfig(base({ turnSeconds: "abc", reserveSeconds: 0 }));
  assert.ok(r.error);
  assert.match(r.error, /n[uú]mero entero positivo de minutos/i);
});

test("(i) rejects reserve >60 min with the upper-bound message", () => {
  const r = validateConfig(base({ turnSeconds: 240, reserveSeconds: 4200 }));
  assert.ok(r.error);
  assert.match(r.error, /60 minutos/);
});

// ---------------------------------------------------------------------------
// Feature 004: mode-aware validation for match-clock configurations.
// ---------------------------------------------------------------------------

const matchBase = (over = {}) => ({
  player1Name: "Alice",
  player2Name: "Bob",
  mode: "per-match",
  turnSeconds: 240,
  reserveSeconds: 300,
  matchSeconds: 4500,
  ...over,
});

test("(j) accepts per-match mode with 75-min default and preserves matchSeconds", () => {
  const r = validateConfig(matchBase());
  assert.equal(r.error, undefined);
  assert.equal(r.config.mode, "per-match");
  assert.equal(r.config.matchSeconds, 4500);
});

test("(k) per-match rejects matchSeconds=0 with the '1 minuto' message", () => {
  const r = validateConfig(matchBase({ matchSeconds: 0 }));
  assert.ok(r.error);
  assert.match(r.error, /1 minuto/);
});

test("(l) per-match rejects matchSeconds=10860 (181 min) with the 180-minute upper bound", () => {
  const r = validateConfig(matchBase({ matchSeconds: 10860 }));
  assert.ok(r.error);
  assert.match(r.error, /180 minutos/);
});

test("(m) per-match rejects fractional minutes (matchSeconds=90 = 1.5 min) via integer-minutes guard", () => {
  const r = validateConfig(matchBase({ matchSeconds: 90 }));
  assert.ok(r.error);
  assert.match(r.error, /n[uú]mero entero de minutos/i);
});

test("(n) per-match rejects non-numeric matchSeconds with the 'número entero positivo' message", () => {
  const r = validateConfig(matchBase({ matchSeconds: "abc" }));
  assert.ok(r.error);
  assert.match(r.error, /n[uú]mero entero positivo de minutos/i);
});

test("(o) missing mode defaults to per-turn (legacy raw input)", () => {
  // Legacy clients omit `mode` entirely; validator must still accept.
  const raw = { player1Name: "A", player2Name: "B", turnSeconds: 240, reserveSeconds: 300 };
  const r = validateConfig(raw);
  assert.equal(r.error, undefined);
  assert.equal(r.config.mode, "per-turn");
});
