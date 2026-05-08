// tests/state.visualStateDelta.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { derivePlayerVisualStateDelta } from "../assets/js/state.js";

const player = (turn, reserve) => ({
  name: "x",
  turnRemainingMs: turn,
  reserveRemainingMs: reserve,
});

const match = (p0, p1) => ({ players: [p0, p1] });

test("returns [] when both players' visual state is unchanged (normal→normal)", () => {
  const prev = match(player(5000, 0), player(5000, 0));
  const next = match(player(4000, 0), player(5000, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), []);
});

test("normal → in_reserve emits enteredReserve for that player only", () => {
  const prev = match(player(1, 5000), player(5000, 0));
  const next = match(player(0, 5000), player(5000, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), ["p1:enteredReserve"]);
});

test("in_reserve → exhausted emits enteredExhausted for that player only (p2)", () => {
  const prev = match(player(5000, 0), player(0, 1));
  const next = match(player(5000, 0), player(0, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), ["p2:enteredExhausted"]);
});

test("normal → exhausted directly (background-skip / strict mode) emits ONLY enteredExhausted", () => {
  const prev = match(player(2000, 0), player(5000, 0));
  const next = match(player(0, 0), player(5000, 0));
  const tags = derivePlayerVisualStateDelta(prev, next);
  assert.deepEqual(tags, ["p1:enteredExhausted"]);
  assert.equal(tags.includes("p1:enteredReserve"), false);
});

test("staying in in_reserve returns []", () => {
  const prev = match(player(0, 4000), player(5000, 0));
  const next = match(player(0, 3000), player(5000, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), []);
});

test("staying in exhausted returns []", () => {
  const prev = match(player(0, 0), player(5000, 0));
  const next = match(player(0, 0), player(5000, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), []);
});

test("inactive player not transitioning produces no tag for them", () => {
  // p2 transitions, p1 stays put
  const prev = match(player(5000, 0), player(1, 4000));
  const next = match(player(5000, 0), player(0, 4000));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), ["p2:enteredReserve"]);
});

test("simultaneous transitions for both players: p1 first, then p2", () => {
  const prev = match(player(1, 5000), player(0, 1));
  const next = match(player(0, 5000), player(0, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), [
    "p1:enteredReserve",
    "p2:enteredExhausted",
  ]);
});

test("backwards transitions (e.g., reset) emit nothing", () => {
  const prev = match(player(0, 0), player(0, 0));
  const next = match(player(5000, 0), player(5000, 0));
  assert.deepEqual(derivePlayerVisualStateDelta(prev, next), []);
});

test("missing prev or next is a no-op", () => {
  assert.deepEqual(derivePlayerVisualStateDelta(null, match(player(5, 0), player(5, 0))), []);
  assert.deepEqual(derivePlayerVisualStateDelta(match(player(5, 0), player(5, 0)), null), []);
});
