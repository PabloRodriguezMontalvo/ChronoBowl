# Implementation Plan: Configure timers in minutes

**Branch**: `003-minutes-input` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-minutes-input/spec.md`

## Summary

Switch the configuration form's per-turn and reserve inputs from **seconds**
to **minutes**. The internal `Config` schema and the persisted
`bbtimer.config.v1` storage shape keep their seconds-based field names, so
all existing pure helpers and 54 automated tests continue to pass unchanged.
The change is contained to a thin "view-model" adapter layer in
`assets/js/main.js` (read/write inputs) plus label edits in `index.html`,
and a small surface-area update in `assets/js/state.js → validateConfig` so
that error messages refer to minutes and the validator accepts whole
minutes (rejecting fractional values).

## Technical Context

**Language/Version**: ES2022 modules, served as static files (no build step)  
**Primary Dependencies**: Bulma 1.0.2 + Animate.css 4.1.1 (vendored)  
**Storage**: `localStorage` keys `bbtimer.config.v1` (seconds, unchanged) and `bbtimer.audio.v1` (booleans, untouched)  
**Testing**: `node --test` over the existing `tests/*.test.mjs` suite (54 tests)  
**Target Platform**: Modern browsers on desktop and mobile (GitHub Pages hosting)  
**Project Type**: Single-page static web app  
**Performance Goals**: 60 fps render loop preserved; this change touches only the config screen and runs once per submit  
**Constraints**: Zero test regressions (SC-003 of spec); zero new runtime dependencies; persisted-storage shape unchanged  
**Scale/Scope**: ~30 LOC delta across `index.html`, `main.js`, and `state.js`; no new files

## Constitution Check

The repository constitution (`.specify/memory/constitution.md`) currently
contains only template placeholders — no concrete project principles have
been ratified. No gates apply. **Pass.**

The two implicit project conventions inherited from features 001 and 002
are nonetheless honored:

1. **Pure helpers stay pure** — `validateConfig` in `state.js` is updated
   in place; no DOM, time, or storage access is added.
2. **Tests-first when adding behavior** — a small unit test extension for
   `validateConfig` (whole-minute rejection) is added before the
   validator change.

## Project Structure

### Documentation (this feature)

```text
specs/003-minutes-input/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── form-contract.md # The single boundary contract
├── checklists/
│   └── requirements.md  # Already created in /speckit.specify
└── tasks.md             # Phase 2 (created later by /speckit.tasks)
```

### Source Code (repository root)

```text
/
├── index.html                      # Edit: input min, default value, labels
├── assets/
│   ├── css/app.css                 # Possibly add small unit-suffix style
│   └── js/
│       ├── main.js                 # Edit: populateForm + readForm adapters
│       ├── state.js                # Edit: validateConfig messages + integer check
│       ├── render.js               # Untouched
│       ├── input.js                # Untouched
│       ├── storage.js              # Untouched
│       └── audio.js                # Untouched
└── tests/
    └── state.validateConfig.test.mjs  # NEW (or extend existing if present)
```

**Structure Decision**: Continue the existing flat single-project layout
(no Option labels). All edits land in three files; one new (or extended)
test file is added. The persisted localStorage shape remains
`{ player1Name, player2Name, turnSeconds, reserveSeconds }`.

## Complexity Tracking

No constitution violations to justify. The "two units in the system"
(seconds in storage, minutes in the form) is the simpler alternative,
not the complex one — changing the storage schema would invalidate
existing user data and trigger churn across all 54 tests for zero
user-visible benefit.
