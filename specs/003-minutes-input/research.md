# Research — Configure timers in minutes

**Feature**: 003-minutes-input  
**Phase**: 0 (Outline & Research)  
**Date**: 2026-05-08

The feature has zero `[NEEDS CLARIFICATION]` markers in [spec.md](spec.md).
Research therefore focuses on validating the chosen technical approach and
documenting the rejected alternatives, not on resolving unknowns.

---

## R-001 — Where to perform the unit conversion

**Decision**: At the **form-layer boundary in `assets/js/main.js`**
(specifically inside `populateForm` for read and inside the form-submit
handler before calling `validateConfig` for write). The DOM inputs hold
minutes; everything downstream of `validateConfig` continues to receive
seconds.

**Rationale**:

- Keeps every existing pure helper, every reducer, every test untouched.
- The conversion is a single multiplication/division by 60 — trivially
  correct and trivially auditable.
- Matches the project convention established in feature 002: side-effects
  and adapters live in `main.js`; pure logic lives in `state.js`.

**Alternatives considered**:

- *Change the persisted schema* (`turnMinutes` / `reserveMinutes`):
  rejected. Forces a localStorage migration, breaks every existing user's
  saved config on first reload, churns the entire test suite, and yields
  zero user-visible benefit since the user never reads `localStorage`.
- *Convert inside `validateConfig`*: rejected. Would couple a pure helper
  to a UI-only concern (the field name in the DOM) and would still leave
  the read path (`populateForm`) needing its own conversion.

---

## R-002 — How to express "whole minutes only"

**Decision**: The HTML input keeps `type="number"` with `step="1"` and
`min="1"` (per-turn) / `min="0"` (reserve). The `validateConfig` helper
gains an explicit `Number.isInteger(value)` check to reject fractional
inputs that bypass the browser's `step` attribute (Firefox is permissive
here when the user types directly).

**Rationale**:

- `step="1"` already gives the spinner buttons whole-minute increments.
- `Number.isInteger` is a one-line guard that makes FR-003 testable.
- Validation messages can be reworded to mention minutes without changing
  the function's signature.

**Alternatives considered**:

- *Silent rounding* (`Math.floor`): rejected. The user typed `1.5`
  expecting 1 min 30 s; floor would give them 1 minute and they would
  notice only mid-match. Explicit rejection is honest.
- *Switch to `<select>` with preset options*: rejected. Too restrictive
  for tournament configurations that occasionally want unusual values
  like 7 minutes.

---

## R-003 — Default values & upper bound after the unit change

**Decision**: Defaults become **4** (per-turn) and **5** (reserve). Upper
bound becomes **60 minutes** for both fields (down from 3600 seconds = 60
minutes — the same ceiling, just expressed in the new unit).

**Rationale**:

- 4 / 5 are the spec-mandated defaults (FR-007) and match the most common
  tournament setting.
- The previous max of 3600 s was already 60 min; no real-world tournament
  needs more, so the user-facing semantic is unchanged.
- HTML `max="60"` makes the spinner stop at a sensible value.

**Alternatives considered**:

- *Keep the previous 3600 ceiling literally* (i.e. `max="3600"` minutes →
  60 hours): rejected, would let a fat-fingered user accidentally
  configure a multi-day timer.

---

## R-004 — Backwards compatibility for existing saved configs

**Decision**: No code changes in `storage.js`. The form-layer adapter
reads `loadConfig().turnSeconds` and divides by 60 when populating the
input. Existing users see their previous setting expressed in minutes
(e.g. 240 s → `4`).

**Rationale**:

- Avoids any migration code.
- Round-trips cleanly because the form always submits whole minutes,
  which become whole-second multiples of 60 in storage.
- Edge case: a user with a legacy saved value that is *not* a multiple
  of 60 (theoretically possible from manual localStorage edits) will see
  it rounded to the nearest minute on load. We accept this — those
  values cannot exist via normal UI use, and the user can immediately
  reconfigure if surprised.

**Alternatives considered**:

- *Block load and force reconfiguration* if the stored value is not a
  multiple of 60: rejected. Disruptive for a hypothetical edge case
  that practically does not occur.

---

## R-005 — Test strategy

**Decision**: Add a small **`tests/state.validateConfig.test.mjs`** covering
the new integer guard and the new error wording (in minutes). Existing
tests remain untouched and must continue to pass (SC-003).

**Rationale**:

- The integer guard is the only new pure-logic behavior; it deserves a
  unit test by repository convention.
- Adapter conversion in `main.js` is a one-liner exercised by the manual
  quickstart (§3); writing a DOM-level test for `populateForm` would
  require introducing a DOM environment (jsdom) for a single trivial
  assertion. Out of scope.
