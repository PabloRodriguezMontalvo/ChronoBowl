# Research — Match-clock mode

**Feature**: 004-match-clock-mode  
**Phase**: 0 (Outline & Research)  
**Date**: 2026-05-08

The clarification session resolved the three load-bearing questions
(storage shape, flag-fall behaviour, card visual). The remaining
research focuses on validating the chosen technical approach and
documenting the rejected alternatives.

---

## R-001 — How match-clock mode coexists with feature 002 audio cues

**Decision**: **Do not modify `audio.js` or `derivePlayerVisualStateDelta`.**
Match-clock mode keeps `reserveRemainingMs` at `0`. The pure helper
already classifies a player with `turnRemainingMs > 0` as `normal` and
both fields at `0` as `exhausted`; the `in_reserve` state simply never
occurs in match-clock mode because `turnRemainingMs > 0 → normal` and
`turnRemainingMs === 0 → exhausted` (since reserve is always 0). FR-008
is satisfied structurally with zero new conditional code.

**Rationale**:

- The cleanest extension is the one that doesn't extend.
- The existing tests for `derivePlayerVisualStateDelta` and `audio.js`
  remain untouched, protecting SC-003.
- The "exhausted" cue still fires correctly on flag-fall (FR-007).

**Alternatives considered**:

- *Add `mode` parameter to `derivePlayerVisualStateDelta`*: rejected.
  Pollutes a pure helper with mode-awareness for a problem that
  resolves itself by construction.
- *Add a `muteCueId` shortcut for `enterReserve` in match-clock mode*:
  rejected. Extra state, same outcome.

---

## R-002 — Where the `match-over` phase transition is detected

**Decision**: Inside `recompute(match, now)` in `state.js`. After the
existing two-tier subtraction, if `mode === "per-match"` AND any
player's `turnRemainingMs` reached `0` AND `phase === "running"`,
return a new match with `phase = "match-over"` and clear
`turnStartedAtPerfNow`. This is the only place that already inspects
remaining time per tick, so the transition is detected at the natural
chokepoint.

**Rationale**:

- One transition site = one test case to write.
- `recompute` is already the only function that mutates remaining
  time, so adding the phase flip there makes the invariant
  "match-over only happens when a clock crossed zero" trivially
  true.
- The render layer reads `match.phase` once per frame; banner
  rendering becomes a one-line read in `render.js`.

**Alternatives considered**:

- *Detect in the rAF tick in `main.js`*: rejected. Forces the impure
  layer to re-run zero-checks already performed in `recompute`.
- *Detect inside `endTurn`*: rejected. Misses the case where a player
  runs out without pressing end-turn (the most likely real-world
  scenario).

---

## R-003 — Suppressing inputs while in `match-over`

**Decision**: Add a single `phase !== "match-over"` guard at the top of
`endTurn` and `pause`, mirroring the existing `phase === "running"`
checks. Pointer/keyboard handlers do not need to change because they
delegate to those reducers, and `installInput` is unaware of phase.
Reset is unguarded (FR-007a).

**Rationale**:

- Two-line change, mirrors the existing `phase` guard pattern from
  features 001–003.
- Passes one extension test in `state.endTurn.test.mjs` and one in
  `state.pauseResume.test.mjs`.

**Alternatives considered**:

- *Disable buttons via CSS / `disabled` attributes*: rejected as the
  authoritative defense — input.js still routes keyboard `A`/`L` into
  `endTurn`. Belt-and-suspenders is fine, but the reducer guard is
  the load-bearing defense.

---

## R-004 — Form interaction when toggling between modes

**Decision**: When the user clicks a mode radio, **do not auto-submit
or recompute**. Just toggle which input groups are visible (per-turn
fieldset vs. match-clock fieldset). The user clicks "Crear partida" to
commit. Both groups' inputs retain their independently-typed values
across toggles within a single session because the DOM holds them.

**Rationale**:

- Familiar interaction, no surprise.
- Each mode's last value is preserved across toggles for the duration
  of the session — switching back and forth does not destroy state.
- The persisted-storage layer separately preserves both modes' last
  *committed* values (via the additive fields), so reload restores
  the most-recently-saved values for both modes.

**Alternatives considered**:

- *Single shared "minutes" input that means different things by mode*:
  rejected. Loses the pre-feature-003 per-turn defaults (4 / 5) when
  the user toggles to per-match and back.

---

## R-005 — Defaults & bounds for the match-clock input

**Decision**:
- Default value: **75 minutes** (per the user's spec input).
- Min: **1 minute**.
- Max: **180 minutes**.
- Validation message wording stays consistent with feature 003 (refers
  to minutes; integer-minute guard via `% 60 !== 0`).

**Rationale**:

- 75 is the user-mandated standard.
- 180 is comfortably above any tournament-realistic value while
  preventing fat-finger entries (`750`).

**Alternatives considered**:

- *Match the per-turn ceiling of 60*: rejected. Tournaments using
  match-clock format routinely use 75–90 min budgets, which would be
  over the 60-min cap.

---

## R-006 — Test strategy

**Decision**: One new file `tests/state.matchClock.test.mjs` covers the
three state-machine extensions:

1. `recompute` does NOT spill into reserve when `mode === "per-match"`
   (because reserve is always 0; this test pins the invariant).
2. `recompute` transitions phase to `match-over` when a match-clock
   player's clock crosses zero.
3. `endTurn` does NOT refill `turnRemainingMs` when `mode === "per-match"`.
4. `endTurn` and `pause` are no-ops when `phase === "match-over"`.

Two existing files are extended:

- `state.validateConfig.test.mjs` adds 3 cases for the new mode-aware
  validation: per-match accepts 75, rejects 0, rejects 4500 minutes,
  and rejects fractional values via the same integer-minute guard.
- `state.visualStateDelta.test.mjs` adds 1 case: in match-clock mode
  (reserve always 0), `normal → exhausted` emits only `enteredExhausted`
  — same as the strict-mode case from feature 002, by construction.

DOM-level rendering of the banner and the hidden reserve element are
exercised manually via the quickstart, not automated.

---

## R-007 — Backwards compatibility (existing user configs)

**Decision**: `loadConfig` populates missing `mode` with `"per-turn"`
and missing `matchSeconds` with `4500` (75 × 60). No migration code,
no schema-version bump. Per FR-004 and SC-004.

**Rationale**:

- Older saves contained only the per-turn fields; defaulting `mode` to
  `"per-turn"` makes their experience byte-for-byte unchanged.
- `matchSeconds = 4500` ensures that when they first switch to
  match-clock mode the form shows the standard 75 default.

**Alternatives considered**:

- *Bump `schemaVersion` to 2 and migrate*: rejected. No data is
  removed or restructured; the additive default-on-load pattern is
  simpler and lossless.
