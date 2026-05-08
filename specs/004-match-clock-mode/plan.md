# Implementation Plan: Match-clock mode (chess-style)

**Branch**: `004-match-clock-mode` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-match-clock-mode/spec.md`

## Summary

Add a chess-clock alternative to the existing per-turn timing model. The
configuration form gains a two-radio `mode` selector ("Por turno" /
"Por partida"); the new mode shows a single `Tiempo por jugador (minutos)`
input, default 75 (range 1–180). At runtime, match-clock mode reuses each
player's `turnRemainingMs` field as the per-player chess-clock budget,
keeps `reserveRemainingMs` at zero, and skips the per-turn refill on
`endTurn`. When either player's clock first reaches `0:00`, the match
transitions to a new `match-over` phase that freezes both clocks,
suppresses end-turn / pause / card-tap inputs, and shows a "¡Tiempo
agotado!" banner.

The feature is additive: storage gains `mode` and `matchSeconds`, the
runtime `Match` object gains `mode` and a fourth `phase` value, and the
audio module is unchanged (the cue suppression for "entered reserve" is
implicit because `reserveRemainingMs` is zero, so feature 002's pure
delta helper never emits the `enteredReserve` tag in match-clock mode).

## Technical Context

**Language/Version**: ES2022 modules, served as static files (no build step)  
**Primary Dependencies**: Bulma 1.0.2 + Animate.css 4.1.1 (vendored). **No new libraries.**  
**Storage**: `localStorage` key `bbtimer.config.v1` (gains `mode` + `matchSeconds` fields, schemaVersion stays at 1)  
**Testing**: `node --test` over the existing `tests/*.test.mjs` suite (currently 63 tests after feature 003)  
**Target Platform**: Modern browsers on desktop and mobile (GitHub Pages hosting)  
**Project Type**: Single-page static web app  
**Performance Goals**: 60 fps render loop preserved; the match-clock recompute is the same per-tick subtraction already used for per-turn  
**Constraints**: Zero regressions on the 63 existing tests (SC-003); no new runtime dependencies; persisted-storage stays at schemaVersion 1 with additive fields only  
**Scale/Scope**: ~120 LOC delta across `index.html`, `state.js`, `main.js`, `render.js`, `storage.js`; one new test file plus modest extensions to existing test files

## Constitution Check

The repository constitution (`.specify/memory/constitution.md`) is the
template scaffold; no concrete principles are ratified. **Pass.**

Inherited project conventions from features 001–003 are honored:

1. **Pure helpers stay pure** — every reducer (`recompute`, `endTurn`,
   `pause`, `reset`) and `validateConfig` is updated in place; no DOM,
   time, or storage access is added.
2. **Tests-first when adding behavior** — three test extensions land
   before their implementations: validator (mode-aware), `recompute`
   (no-op refill in match-clock + match-over transition), and `endTurn`
   (no refill in match-clock).
3. **Adapters at the boundary** — form/storage shape conversion lives
   in `main.js` and `storage.js`'s thin `loadConfig` defaults; the
   purely audio-side `derivePlayerVisualStateDelta` from feature 002 is
   not modified (mode-suppression of the `enteredReserve` cue is
   structural, not conditional).

## Project Structure

### Documentation (this feature)

```text
specs/004-match-clock-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── config-storage-contract.md   # bbtimer.config.v1 additive shape
│   └── form-contract.md             # Mode selector + match-clock input
├── checklists/
│   └── requirements.md  # Already created in /speckit.specify
└── tasks.md             # Phase 2 (created later by /speckit.tasks)
```

### Source Code (repository root)

```text
/
├── index.html                      # Edit: add mode fieldset, match input, ¡Tiempo agotado! banner
├── assets/
│   ├── css/app.css                 # Edit: hide reserve in match-clock cards; banner style
│   └── js/
│       ├── main.js                 # Edit: form mode toggle, populate/read adapters per mode
│       ├── state.js                # Edit: defaultConfig, validateConfig, idleMatch, startMatch,
│       │                           #       recompute (match-over transition), endTurn (no refill)
│       ├── render.js               # Edit: hide reserve in match-clock; banner; phase==='match-over'
│       ├── input.js                # Untouched (state guards already gate inputs)
│       ├── storage.js              # Edit: loadConfig defaults `mode` + `matchSeconds`
│       └── audio.js                # Untouched
└── tests/
    ├── state.matchClock.test.mjs              # NEW (recompute + endTurn + match-over)
    ├── state.validateConfig.test.mjs          # EXTEND (mode-aware cases)
    └── state.visualStateDelta.test.mjs        # EXTEND (no enteredReserve in match-clock)
```

**Structure Decision**: Continue the existing flat single-project layout.
All edits land in five existing files; one new test file is added and
two existing test files are extended. The persisted localStorage key
remains `bbtimer.config.v1` with `schemaVersion: 1` — only additive
fields are introduced.

## Complexity Tracking

No constitution violations to justify. The cross-cutting touch points
are intentional, not accidental:

- The new `phase: "match-over"` value is required by Q2 (clarification
  session) and removing it would force suppressing end-turn / pause /
  card-tap via flags scattered across `main.js`, which is strictly
  worse than one centralized phase guard.
- Reusing `turnRemainingMs` to hold the match clock instead of adding a
  new `matchRemainingMs` field is a deliberate simplification: it lets
  the existing `recompute` subtract elapsed time without branching on
  mode (the only difference is `endTurn` skips the refill), and lets
  feature 002's audio cue logic continue to work unchanged.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                   |
