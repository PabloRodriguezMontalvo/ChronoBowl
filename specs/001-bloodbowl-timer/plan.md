# Implementation Plan: Blood Bowl Turn Chronometer

**Branch**: `001-bloodbowl-timer` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-bloodbowl-timer/spec.md`

## Summary

A static, single-page, fully client-side chess-clock-style timer for Blood Bowl turns. Two named players share one device (laptop or phone). Each turn has a configured per-turn time and an optional carry-over reserve pool that engages automatically when the per-turn timer hits zero. Players alternate turns with a single key press (or a tap on their half of the screen on mobile); a single key (or button) toggles pause. The site is deployed as a static GitHub Pages site, has zero runtime dependencies, and works fully offline after first load. Time accuracy is preserved across backgrounded tabs by computing remaining time from monotonic `performance.now()` deltas rather than tick counts.

The full set of technology decisions, alternatives, and rationale is in [research.md](research.md). The state shape and pure transitions are in [data-model.md](data-model.md). Inputs, visual states, and persistence schema are in [contracts/ui-contract.md](contracts/ui-contract.md). Local run, manual acceptance walkthrough, and deployment steps are in [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022, ES modules, no transpiler).  
**Primary Dependencies**: Bulma 1.x (vendored CSS) + Animate.css 4.x (vendored CSS). No JavaScript libraries. No package manager required.  
**Storage**: `localStorage` for `Configuration` only (key `bbtimer.config.v1`). No databases. No backend.  
**Testing**: Node 20+ built-in test runner (`node --test`) for the pure clock-and-transition logic; manual acceptance walkthrough per [quickstart.md](quickstart.md) for UI behaviour. **Node is a development-time dependency only**; it is never shipped to GitHub Pages and is not required to view, install, or use the deployed site.
**Target Platform**: Modern evergreen browsers (Chrome, Edge, Safari, Firefox) on desktop and mobile. Static hosting on GitHub Pages.  
**Project Type**: Single static web page (no frontend/backend split).  
**Performance Goals**: time-to-interactive < 2 s on a typical 4G mobile connection (per SC-005); ±1 s cumulative timer drift across a 30-turn match including 60 s of backgrounding (SC-003); turn switch within 200 ms of input (SC-004); 60 fps render while visible.
**Constraints**: Fully offline-capable after first load (FR-020); no network calls at runtime; no build step (deployable by pushing static files to `main`); no third-party CDN dependencies; tap targets ≥ 44×44 px (SC-007); usable from 320 px viewports up (FR-018).  
**Scale/Scope**: Two simultaneous players on one device, one match at a time. ~5 source files, ~500 LOC of vanilla JS, ~200 LOC of custom CSS layered on Bulma + Animate.css.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository's `.specify/memory/constitution.md` is an unfilled template — all principle slots still contain placeholder text (`[PRINCIPLE_1_NAME]`, etc.). There are therefore no project-specific constitutional principles in force to evaluate against.

**Result**: PASS by vacuity. No violations are recorded in the Complexity Tracking table because there are no concrete principles to violate. If the constitution is filled in later, this section must be revisited before proceeding to `/speckit.tasks`.

Generic engineering hygiene applied as a self-imposed bar (consistent with the organisation default-instructions in `.github/copilot-instructions.md` references):

- ✅ No backend, no database, no runtime SaaS dependency — matches the "no backend, GitHub Pages only" hard constraint.
- ✅ No build pipeline, no transpiler, no `node_modules` shipped — minimal complexity, deletable code.
- ✅ Pure-function clock logic is unit-testable with zero npm dependencies via `node --test`.
- ✅ Externalised, validated configuration (per-turn time, reserve, names); no hardcoded environment values.
- ✅ No secrets or PII handled. Names are user-chosen labels stored locally only.

**Re-check after Phase 1 design**: PASS. Phase 1 artefacts (data-model, contract, quickstart) introduce no additional dependencies, no shared mutable state beyond a single in-module match state object, and no security-sensitive surfaces.

## Project Structure

### Documentation (this feature)

```text
specs/001-bloodbowl-timer/
├── plan.md                    # This file
├── research.md                # Phase 0 — decisions & rationale
├── data-model.md              # Phase 1 — state shape & pure transitions
├── quickstart.md              # Phase 1 — local run, acceptance walkthrough, deploy
├── contracts/
│   └── ui-contract.md         # Phase 1 — input bindings, visual states, persistence schema
├── checklists/
│   └── requirements.md        # Created by /speckit.specify
└── tasks.md                   # Created later by /speckit.tasks
```

### Source Code (repository root)

The repo root **is** the deployment root for GitHub Pages. There is intentionally no `src/` or build directory — the files committed are the files served.

```text
/
├── index.html                 # Single page: configuration screen + match screen (toggled by phase)
├── .nojekyll                  # Empty file; tells GitHub Pages to skip Jekyll processing
├── README.md                  # Project description, screenshots, link to live site
├── assets/
│   ├── css/
│   │   └── app.css            # Custom styles layered on Bulma; defines visual states from ui-contract
│   ├── js/
│   │   ├── main.js            # App entry: wires DOM, keyboard, touch, render loop
│   │   ├── state.js           # Match/PlayerClock/Configuration state + reducers (startMatch, recompute, endTurn, pause, reset)
│   │   ├── render.js          # render(state) — DOM updates only, no logic
│   │   ├── input.js           # Keyboard + pointer bindings, debounce, visibilitychange handler
│   │   └── storage.js         # Read/write bbtimer.config.v1 in localStorage with safe fallback
│   └── vendor/
│       ├── bulma.min.css      # Pinned version, vendored locally (offline-safe)
│       └── animate.min.css    # Pinned version, vendored locally
└── tests/
    ├── state.recompute.test.mjs    # node --test
    ├── state.endTurn.test.mjs
    └── state.pauseResume.test.mjs
```

**Structure Decision**: Flat static layout, no build step. Source modules are loaded from `index.html` as native ES modules (`<script type="module" src="./assets/js/main.js"></script>`). The same files that work locally via `python -m http.server` or `npx http-server` are exactly what GitHub Pages serves — there is no compile, bundle, or minify step. Tests live alongside the app under `tests/` and are runnable with `node --test tests` without installing any dependency.

## Complexity Tracking

> No constitutional violations recorded. The constitution file is unfilled (placeholders only). If the project's constitution is later defined and any principle would be violated by this plan, justifications must be added here before `/speckit.tasks`.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _none_    | _n/a_      | _n/a_                                |
