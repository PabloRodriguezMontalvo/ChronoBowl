// tests/state.pauseResume.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  startMatch,
  pause,
  endTurn,
} from "../assets/js/state.js";

const cfg = { ...defaultConfig(), turnSeconds: 10, reserveSeconds: 5 };

test("pause while running: recomputes then freezes (phase = paused, turnStartedAtPerfNow = null)", () => {
  let m = startMatch(cfg, 0);
  m = pause(m, 3_000); // pause after 3s
  assert.equal(m.phase, "paused");
  assert.equal(m.turnStartedAtPerfNow, null);
  assert.equal(m.players[0].turnRemainingMs, 7_000); // 3s consumed before pause
});

test("pause while paused: resumes (phase = running, turnStartedAtPerfNow = now)", () => {
  let m = startMatch(cfg, 0);
  m = pause(m, 3_000); // paused
  m = pause(m, 60_000); // 57s of paused time elapsed
  assert.equal(m.phase, "running");
  assert.equal(m.turnStartedAtPerfNow, 60_000);
  // Crucially, no time was deducted during the pause:
  assert.equal(m.players[0].turnRemainingMs, 7_000);
});

test("endTurn while paused is a no-op", () => {
  let m = startMatch(cfg, 0);
  m = pause(m, 3_000);
  const snapshot = JSON.stringify(m);
  const after = endTurn(m, 4_000, 0);
  assert.equal(JSON.stringify(after), snapshot);
});

test("paused interval does not bleed into clocks on resume", () => {
  let m = startMatch(cfg, 0);
  m = pause(m, 4_000); // P1 has 6s left
  m = pause(m, 100_000); // resume 96s later
  // No time should have ticked off during the 96s pause window — a subsequent
  // recompute call (which does subtract) is the responsibility of the loop.
  assert.equal(m.players[0].turnRemainingMs, 6_000);
});
