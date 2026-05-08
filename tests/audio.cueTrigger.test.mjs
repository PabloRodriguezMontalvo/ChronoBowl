// tests/audio.cueTrigger.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../assets/js/audio.js";

function makeHarness({ initiallyMuted = false } = {}) {
  const playLog = [];
  const store = { schemaVersion: 1, muted: initiallyMuted };
  const prefs = {
    load: () => ({ ...store }),
    save: (p) => Object.assign(store, p),
  };
  const playCue = (cueId) => playLog.push(cueId);
  const audio = createAudio({ playCue, prefs });
  return { audio, playLog, store };
}

// ---------------------------------------------------------------------------
// US1 — entering reserve
// ---------------------------------------------------------------------------

test("US1: first fireForDelta(p1:enteredReserve) plays enterReserve cue", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve"]);
});

test("US1: second consecutive call with same tag does NOT retrigger", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve"]);
});

test("US1: fireForDelta([]) and fireForDelta(undefined) are no-ops", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta([]);
  audio.fireForDelta();
  assert.deepEqual(playLog, []);
});

test("US1: per-player flags are independent (p1 then p2 both play)", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.fireForDelta(["p2:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve", "enterReserve"]);
});

test("US1: handleEndTurn() clears flags so the same tag plays again", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.handleEndTurn();
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve", "enterReserve"]);
});

test("US1: handleReset() clears flags", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.handleReset();
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve", "enterReserve"]);
});

test("US1: handleMatchStart() clears flags", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.handleMatchStart();
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve", "enterReserve"]);
});

// ---------------------------------------------------------------------------
// US2 — exhausted
// ---------------------------------------------------------------------------

test("US2: fireForDelta(p1:enteredExhausted) plays exhausted cue exactly once", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredExhausted"]);
  audio.fireForDelta(["p1:enteredExhausted"]);
  assert.deepEqual(playLog, ["exhausted"]);
});

test("US2: enteredReserve then enteredExhausted plays both in order", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.fireForDelta(["p1:enteredExhausted"]);
  assert.deepEqual(playLog, ["enterReserve", "exhausted"]);
});

test("US2: simultaneous tags fire both cues in the supplied order", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredReserve", "p1:enteredExhausted"]);
  assert.deepEqual(playLog, ["enterReserve", "exhausted"]);
});

test("US2: strict-mode-style enteredExhausted only → only exhausted plays", () => {
  const { audio, playLog } = makeHarness();
  audio.fireForDelta(["p1:enteredExhausted"]);
  assert.deepEqual(playLog, ["exhausted"]);
});

// ---------------------------------------------------------------------------
// US3 — mute toggle
// ---------------------------------------------------------------------------

test("US3: setMuted(true) silences subsequent playback", () => {
  const { audio, playLog } = makeHarness();
  audio.setMuted(true);
  audio.fireForDelta(["p1:enteredReserve"]);
  audio.fireForDelta(["p2:enteredExhausted"]);
  assert.deepEqual(playLog, []);
});

test("US3: setMuted(true) then setMuted(false) restores playback", () => {
  const { audio, playLog } = makeHarness();
  audio.setMuted(true);
  audio.setMuted(false);
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, ["enterReserve"]);
});

test("US3: setMuted writes through to prefs.save", () => {
  const { audio, store } = makeHarness();
  audio.setMuted(true);
  assert.equal(store.muted, true);
  assert.equal(store.schemaVersion, 1);
  audio.setMuted(false);
  assert.equal(store.muted, false);
});

test("US3: factory honors persisted muted=true on construction", () => {
  const { audio, playLog } = makeHarness({ initiallyMuted: true });
  assert.equal(audio.getMuted(), true);
  audio.fireForDelta(["p1:enteredReserve"]);
  assert.deepEqual(playLog, []);
});

test("US3: getMuted reflects current state at any time", () => {
  const { audio } = makeHarness();
  assert.equal(audio.getMuted(), false);
  audio.setMuted(true);
  assert.equal(audio.getMuted(), true);
  audio.setMuted(false);
  assert.equal(audio.getMuted(), false);
});
