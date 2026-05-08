# Tasks: Match-clock mode (chess-style)

**Input**: Design documents from `/specs/004-match-clock-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The plan mandates tests-first for the three reducer-level behaviour changes (validator, `recompute`, `endTurn`).

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task serves (US1, US2, US3)
- File paths are repo-relative

---

## Phase 1: Setup

**Purpose**: Workspace prep (no project init — existing single-page app).

- [X] T001 [P] Confirm baseline: run `node --test tests` and verify the 63 pre-existing tests pass on branch `004-match-clock-mode` before any edits.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage / config plumbing and the mode-aware validator. Every user story depends on these.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Tests (write first, must FAIL before implementation)

- [X] T002 [P] Extend [tests/state.validateConfig.test.mjs](tests/state.validateConfig.test.mjs) with three mode-aware cases per [data-model.md](specs/004-match-clock-mode/data-model.md#validation-surface-spanish-error-strings): (a) `mode:"per-match", matchSeconds:4500` accepted; (b) `mode:"per-match", matchSeconds:0` rejected with the "al menos 1 minuto" message; (c) `mode:"per-match", matchSeconds:10860` (181 min) rejected with the 180-min upper-bound message; (d) `mode:"per-match"` with a non-multiple of 60 rejected via the existing integer-minute guard.
- [X] T003 [P] Add a new test in [tests/state.visualStateDelta.test.mjs](tests/state.visualStateDelta.test.mjs) asserting that in match-clock mode (both `reserveRemainingMs` always `0`), a `normal → exhausted` transition emits exactly `enteredExhausted` and never `enteredReserve` (per FR-008 / R-001).

### Implementation

- [X] T004 [US1][US2][US3] Update `defaultConfig` in [assets/js/state.js](assets/js/state.js) to return `mode: "per-turn"` and `matchSeconds: 4500` alongside the existing fields per [contracts/config-storage-contract.md](specs/004-match-clock-mode/contracts/config-storage-contract.md).
- [X] T005 [US1][US2][US3] Make `validateConfig` in [assets/js/state.js](assets/js/state.js) mode-aware: when `raw.mode === "per-match"`, validate `matchSeconds` (positive integer, ≥ 60, ≤ 10800, multiple of 60) and pass through the inactive mode's existing `turnSeconds`/`reserveSeconds`; when `mode` is `"per-turn"` or missing, retain today's checks. Use the Spanish messages listed in [data-model.md](specs/004-match-clock-mode/data-model.md#validation-surface-spanish-error-strings). Run T002 — must now pass.
- [X] T006 [US3] Update `loadConfig` in [assets/js/storage.js](assets/js/storage.js) to default `mode → "per-turn"` and `matchSeconds → 4500` when fields are missing on legacy saves; ensure `saveConfig` writes both new fields verbatim. Verify SC-004 by manually loading a legacy `{schemaVersion:1, turnSeconds:240, reserveSeconds:300}` payload via DevTools.
- [X] T007 [US1][US2] Update `idleMatch(config)` and `startMatch(config, now)` in [assets/js/state.js](assets/js/state.js) to: (a) copy `config.mode` onto the resulting `Match`; (b) when `mode === "per-match"`, seed both players' `turnRemainingMs` from `config.matchSeconds * 1000` and `reserveRemainingMs` to `0`; (c) when `mode === "per-turn"`, retain today's behaviour.

**Checkpoint**: Foundation ready — Phase 3 and Phase 4 can begin in parallel.

---

## Phase 3: User Story 1 — Choose match-clock mode at setup (Priority: P1) 🎯 MVP slice

**Goal**: A user can pick "Por turno" vs. "Por partida" on the configuration screen, see the appropriate inputs, and create a match in either mode.

**Independent Test**: Per [quickstart.md](specs/004-match-clock-mode/quickstart.md) scenarios A and B — toggling modes shows/hides the correct fieldsets, defaults are 4 / 5 (per-turn) and 75 (per-match), and "Crear partida" produces a match with the expected initial clocks.

### Implementation

- [X] T008 [US1] Add the mode `<fieldset>` and the per-match input group to [index.html](index.html) per [contracts/form-contract.md](specs/004-match-clock-mode/contracts/form-contract.md#configuration-screen-dom-additions): two radios `name="cfg-mode"` (default `per-turn` checked), wrapper `<div id="cfg-per-turn-group">` around the existing per-turn fields, new `<div id="cfg-per-match-group" hidden>` containing `<input id="cfg-match-seconds" type="number" min="1" max="180" step="1" value="75">`.
- [X] T009 [US1] Add the match-over banner to [index.html](index.html): `<div id="match-over-banner" class="notification is-danger has-text-centered" hidden><strong id="match-over-text"></strong></div>` placed below the player-card grid (referenced by Phase 4 work too).
- [X] T010 [US1] In [assets/js/main.js](assets/js/main.js), wire a `change` listener on the mode radios that toggles `hidden` on `#cfg-per-turn-group` / `#cfg-per-match-group` per [form-contract.md](specs/004-match-clock-mode/contracts/form-contract.md#mode-toggle-behaviour). Do NOT re-validate or auto-submit on toggle.
- [X] T011 [US1] Update `populateForm` in [assets/js/main.js](assets/js/main.js) to read `config.mode`, check the matching radio, populate `#cfg-match-seconds` from `config.matchSeconds / 60`, and set group visibility accordingly. Continue populating `#cfg-turn-seconds`/`#cfg-reserve-seconds` from their seconds-÷-60 values per feature 003.
- [X] T012 [US1] Update `readForm` in [assets/js/main.js](assets/js/main.js) to return `{ mode, turnSeconds, reserveSeconds, matchSeconds }`, multiplying every minute input by 60. The validator (T005) decides which fields it checks based on `mode`. Inactive-mode values pass through unchanged so toggling does not destroy them.
- [X] T013 [P] [US1] In [assets/js/render.js](assets/js/render.js), when rendering player cards, set `#player-1-reserve.hidden` and `#player-2-reserve.hidden` to `match.mode === "per-match"`; ensure they are unhidden in per-turn mode. Per FR-013.
- [X] T014 [P] [US1] In [assets/css/app.css](assets/css/app.css), add a centered-only layout rule for cards when the reserve element is `[hidden]` so the single match clock is vertically centered, plus minor styling for `#match-over-banner` if Bulma's `.notification.is-danger` needs override (e.g., margin).

**Checkpoint**: US1 fully functional — user can create matches in either mode and see the right initial clocks. (Per-match end-turn semantics still pending in Phase 4.)

---

## Phase 4: User Story 2 — Match-clock countdown semantics (Priority: P1)

**Goal**: In match-clock mode, the active clock counts down, end-turn freezes the ending player's clock without refill, flag-fall transitions to `match-over` with banner + suppressed inputs.

**Independent Test**: Per [quickstart.md](specs/004-match-clock-mode/quickstart.md) scenarios C, D, E, F.

### Tests (write first, must FAIL before implementation)

- [X] T015 [P] [US2] Create [tests/state.matchClock.test.mjs](tests/state.matchClock.test.mjs) with cases per [research.md R-006](specs/004-match-clock-mode/research.md#r-006--test-strategy):
  1. `recompute` after 30 s in `per-match` mode reduces only the active player's `turnRemainingMs` by 30000 and leaves `reserveRemainingMs` at `0`.
  2. `recompute` transitions `phase` from `"running"` to `"match-over"` when the active player's `turnRemainingMs` crosses zero, clears `turnStartedAtPerfNow`, and floors the value at `0`.
  3. `endTurn` in `per-match` mode freezes the ending player's `turnRemainingMs` at its current value (no refill) and starts the other player's clock from its previous value.
  4. `endTurn` is a no-op when `phase === "match-over"`.
  5. `pause` is a no-op when `phase === "match-over"`.

### Implementation

- [X] T016 [US2] Extend `recompute` in [assets/js/state.js](assets/js/state.js) per [data-model.md](specs/004-match-clock-mode/data-model.md#recomputematch-now): after the existing two-tier subtraction, when `match.mode === "per-match"` AND the active player's `turnRemainingMs` reached `0` AND `match.phase === "running"`, return a copy with `phase: "match-over"` and `turnStartedAtPerfNow: null`.
- [X] T017 [US2] Extend `endTurn` in [assets/js/state.js](assets/js/state.js) per [data-model.md](specs/004-match-clock-mode/data-model.md#endturnmatch-now-sideindex): add `if (match.phase === "match-over") return match` guard at top; when `match.mode === "per-match"`, skip the per-turn refill of `turnRemainingMs` for the ending player; everything else (debounce, side-guard, activeIndex flip, `turnStartedAtPerfNow` reset) unchanged.
- [X] T018 [US2] Extend `pause` in [assets/js/state.js](assets/js/state.js) with the same `match-over` no-op guard. Run T015 — must now pass.
- [X] T019 [US2] In [assets/js/render.js](assets/js/render.js), render the match-over banner per [form-contract.md](specs/004-match-clock-mode/contracts/form-contract.md#match-screen-dom-additions): when `match.phase === "match-over"`, set `#match-over-banner.hidden = false` and write `#match-over-text.textContent = \`¡Tiempo agotado para ${exhaustedPlayer.name}!\`` (the player whose `turnRemainingMs === 0`); otherwise hide it.

**Checkpoint**: US1 + US2 both work. The MVP is shippable.

---

## Phase 5: User Story 3 — Persist mode and round-trip (Priority: P2)

**Goal**: Reloading the app restores the most-recently-saved mode and per-mode values.

**Independent Test**: Per [quickstart.md](specs/004-match-clock-mode/quickstart.md) scenarios G, H, I.

### Implementation

- [ ] T020 [US3] Verify the persistence chain end-to-end: `readForm` → `validateConfig` → `saveConfig` → page reload → `loadConfig` → `populateForm` correctly restores `mode`, `turnSeconds`, `reserveSeconds`, AND `matchSeconds` with both modes' last values intact. No new code expected (T006 + T011 + T012 cover this); this task is the manual round-trip verification of scenarios G and I.
- [ ] T021 [US3] Manually exercise scenario I (legacy save) per [quickstart.md](specs/004-match-clock-mode/quickstart.md#i--legacy-save-compatibility-sc-004): inject a pre-feature-004 payload via DevTools, reload, confirm app opens in `per-turn` with original values and that switching to `per-match` shows the `75` default. Logs SC-004. Also exercise scenario H (per-turn regression check) to confirm SC-003 holds end-to-end.

**Checkpoint**: All three user stories functional.

---

## Phase 6: Polish & Cross-Cutting

- [X] T022 [P] Run full test suite `node --test tests` and confirm ≥ 70 tests pass with zero regressions on the 63 pre-existing tests (SC-003).
- [ ] T023 [P] Walk through every quickstart scenario A–I in [specs/004-match-clock-mode/quickstart.md](specs/004-match-clock-mode/quickstart.md) on Chrome at `http://localhost:8000/`. Record any defects.
- [X] T024 [P] Update repo [README.md](README.md) (if it exists) to mention the new "Por partida" mode and 75-min default; otherwise add a short note to the deploy/usage docs.
- [ ] T025 Verify zero new asset requests vs. feature 003 (no new libraries, no new audio files) using DevTools Network panel — supports the "no new dependencies" plan constraint.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. **BLOCKS** Phases 3, 4, 5.
- **Phase 3 (US1)** & **Phase 4 (US2)**: Both depend on Phase 2; can run in parallel after T007 completes.
- **Phase 5 (US3)**: Depends on Phase 2 (T006) + Phase 3 (T011, T012). Verification only.
- **Phase 6 (Polish)**: Depends on Phases 3–5.

### Within Phase 2

- T002, T003 are parallel-safe (different test files).
- T004 → T005 (validator depends on `defaultConfig` shape).
- T006 is independent (different file: `storage.js`).
- T007 depends on T004 (consumes new config field `mode`/`matchSeconds`).

### Within Phase 3 (US1)

- T008, T009 edit the same file (`index.html`) — sequential.
- T010, T011, T012 edit the same file (`main.js`) — sequential, in that order.
- T013 (`render.js`) and T014 (`app.css`) are parallel with each other and with the `main.js` chain.

### Within Phase 4 (US2)

- T015 first (TDD).
- T016, T017, T018 all edit `state.js` — sequential.
- T019 (`render.js`) is independent of the `state.js` chain and can run in parallel with T016–T018 once T015 lands, **except** that T019 depends on Phase 3's T009 (banner DOM exists).

---

## Parallel Opportunities

- **Phase 2 tests**: `[T002, T003]` together.
- **Phase 3 cross-file work** after T012 lands: `[T013, T014]` together.
- **Phase 6 verification**: `[T022, T023, T024]` together.

### Parallel Example: Phase 2 tests

```bash
# In two separate terminals or as one parallel batch
node --test tests/state.validateConfig.test.mjs   # T002 expectations
node --test tests/state.visualStateDelta.test.mjs # T003 expectation
```

### Parallel Example: Phase 3 polish

```bash
# After T012 (main.js) is done:
# - T013 in render.js
# - T014 in app.css
# These touch disjoint files and can be done concurrently.
```

---

## Implementation Strategy

### MVP scope

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4** (US1 + US2). At that point:

- The user can pick the new mode and create a match (US1).
- The match clock counts down and behaves correctly through end-turn, pause, and flag-fall (US2).
- Persistence works for legacy users (T006 default), but the new `mode`/`matchSeconds` round-trip is unverified — that is US3's deliverable in the next increment.

### Incremental delivery

1. Land Phases 1–2 in one PR (foundational; behaviour-neutral for existing users).
2. Land Phase 3 next (UI only; new mode is selectable but does nothing different yet at runtime if Phase 4 hasn't landed — actually, with T007 done in Phase 2, even Phase 3 alone makes match-clock matches work for countdown via existing `recompute` minus the `match-over` transition; that's an acceptable internal state to ship behind a "beta" flag if needed, but in practice Phases 3 & 4 should land together to satisfy US2).
3. Land Phase 4 (semantics + banner). MVP complete.
4. Land Phase 5 + Phase 6 (verification + docs). Feature complete.

---

## Format Validation

All 25 tasks above follow the required checklist format:
`- [ ] [TaskID] [P?] [Story?] Description with file path`

- ✅ Every task starts with `- [ ]`.
- ✅ Every task has a sequential ID (T001–T025).
- ✅ `[P]` is used only on tasks that touch disjoint files and have no incomplete dependencies.
- ✅ `[US1]`, `[US2]`, `[US3]` appear on Phase 3, 4, 5 tasks; Setup/Foundational/Polish tasks have no story label (with the exception of foundational tasks tagged with multiple story labels to indicate they unblock multiple stories — T004, T005, T007).
- ✅ Every task names exact file paths.
