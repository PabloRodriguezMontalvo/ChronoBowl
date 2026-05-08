---
description: "Task list for Blood Bowl Turn Chronometer implementation"
---

# Tasks: Blood Bowl Turn Chronometer

**Input**: Design documents from `/specs/001-bloodbowl-timer/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: Pure-function logic tests are included because [research.md](research.md) R-008 explicitly mandates them with `node --test` and zero npm dependencies. UI behaviour is validated via the manual walkthrough in [quickstart.md](quickstart.md), not automated DOM tests.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently. The MVP is **US1 + US2 + US3** (all P1 — without all three the product is not a Blood Bowl timer).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1…US6); omitted in Setup, Foundational, and Polish phases
- File paths are exact and rooted at the repository root

## Path Conventions

Flat static layout (no build step). Source files at repo root:

- `index.html`
- `assets/css/app.css`
- `assets/js/{main,state,render,input,storage}.js`
- `assets/vendor/{bulma.min.css,animate.min.css}`
- `tests/*.test.mjs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the empty static site skeleton and vendor third-party CSS so subsequent work has somewhere to land.

- [X] T001 Create the static site folder layout at the repository root: `assets/css/`, `assets/js/`, `assets/vendor/`, `tests/` (empty directories with a `.gitkeep` if needed) per [plan.md](plan.md) → "Project Structure → Source Code"
- [X] T002 Create empty `.nojekyll` at the repository root to disable Jekyll on GitHub Pages per [plan.md](plan.md) and [research.md](research.md) R-007
- [X] T003 [P] Vendor Bulma 1.x to `assets/vendor/bulma.min.css` (download the pinned minified file once and commit it; do NOT load from a CDN at runtime) per [research.md](research.md) R-001 and FR-020
- [X] T004 [P] Vendor Animate.css 4.x to `assets/vendor/animate.min.css` (pinned minified, committed locally) per [research.md](research.md) R-001
- [X] T005 [P] Create `README.md` at the repository root with project name, one-paragraph description, link to the live GitHub Pages URL placeholder, and a "How to run locally" snippet copied from [quickstart.md](quickstart.md) §1
- [X] T006 [P] Create `.gitignore` at the repository root excluding OS junk (`Thumbs.db`, `.DS_Store`) and editor folders (`.vscode/*` already tracked is fine; do not exclude `assets/vendor/` — vendored CSS MUST be committed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The HTML shell and the storage helper. Both must exist before any user story can wire up DOM or persist configuration. There is no database, no auth, no API — foundational work is intentionally minimal.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `index.html` at the repository root containing: `<!doctype html>`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>Blood Bowl Timer</title>`, `<link rel="stylesheet" href="./assets/vendor/bulma.min.css">`, `<link rel="stylesheet" href="./assets/vendor/animate.min.css">`, `<link rel="stylesheet" href="./assets/css/app.css">`, two top-level `<section>` regions stubbed with `id="config-screen"` and `id="match-screen"` (one hidden via `hidden` attribute at start), and `<script type="module" src="./assets/js/main.js"></script>` at the end of `<body>`. Per [plan.md](plan.md) "Project Structure" and [contracts/ui-contract.md](contracts/ui-contract.md) §4
- [X] T008 Create `assets/css/app.css` with: an empty file or a `:root` block defining color custom properties for the six visual states from [contracts/ui-contract.md](contracts/ui-contract.md) §2 (`inactive`, `active-normal`, `active-in-reserve`, `active-exhausted`, `paused`, `idle`). Do not yet style any specific component; subsequent tasks will add rules. Include a `@media (prefers-reduced-motion: reduce)` block that will later disable Animate.css continuous classes
- [X] T009 [P] Create `assets/js/storage.js` exporting `loadConfig()` and `saveConfig(config)`. `loadConfig()` reads `localStorage["bbtimer.config.v1"]`, parses JSON, validates `schemaVersion === 1` plus presence of `player1Name`, `player2Name`, `turnSeconds`, `reserveSeconds`, and returns defaults (`{schemaVersion:1, player1Name:"Player 1", player2Name:"Player 2", turnSeconds:240, reserveSeconds:0}`) on any failure. `saveConfig(config)` writes the JSON. Schema per [contracts/ui-contract.md](contracts/ui-contract.md) §3
- [X] T010 Create `assets/js/main.js` as a stub that imports `loadConfig` from `./storage.js`, reads the config, logs it to the console, and confirms the page boots end-to-end with no network errors. This is the integration smoke test for Phase 2

**Checkpoint**: Empty static site loads in a browser, vendored CSS is applied, no console errors, default config returned by `storage.js`. User story phases may begin.

---

## Phase 3: User Story 1 — Run a head-to-head turn clock (Priority: P1) 🎯 MVP core

**Goal**: Two-clock alternating chess-clock with unmistakable active-player indicator, driven by `performance.now()` for tab-throttling-safe accuracy.

**Independent Test**: Hard-code defaults (4-min turn, 0 reserve, "Player 1"/"Player 2"), open the page, click Start, alternate turns several times via key `A` and `L`, confirm exactly one clock ticks at a time and the active card is visually distinct.

### Tests for User Story 1

- [X] T011 [P] [US1] Create `tests/state.recompute.test.mjs` covering: (a) `recompute(match, now)` subtracts `now - turnStartedAtPerfNow` from the active player's `turnRemainingMs`, (b) when `turnRemainingMs` would go below 0 the underflow is subtracted from `reserveRemainingMs`, (c) both fields are floored at 0, (d) `turnStartedAtPerfNow` is reset to the passed `now` after the call, (e) inactive player's clocks are unchanged. Use `node:test` and `node:assert/strict`. Per [data-model.md](data-model.md) "Pure transitions"
- [X] T012 [P] [US1] Create `tests/state.endTurn.test.mjs` covering: (a) `endTurn(match, now, sideIndex)` with `sideIndex === match.activeIndex` flips `activeIndex`, (b) the previously active player's `turnRemainingMs` is restored to `config.turnSeconds * 1000`, (c) the previously active player's `reserveRemainingMs` is left at its current (post-recompute) value, (d) the new active player's `turnRemainingMs` is unchanged, (e) `lastEndTurnAtPerfNow` is set to the passed `now`, (f) calling again within 150 ms is a no-op (returns the same match), (g) calling with `sideIndex !== match.activeIndex` is a no-op (returns the same match — inactive-side input is rejected), (h) calling while `phase === "paused"` is a no-op. Per [data-model.md](data-model.md) and FR-006, FR-009, FR-014, FR-019

### Implementation for User Story 1

- [X] T013 [US1] Create `assets/js/state.js` exporting pure functions per [data-model.md](data-model.md): `defaultConfig()`, `idleMatch(config)`, `startMatch(config)`, `recompute(match, now)`, `endTurn(match, now, sideIndex)`, `pause(match, now)`, `reset(match, config)`. For US1, fully implement `defaultConfig`, `idleMatch`, `startMatch`, `recompute`, and `endTurn` (including the three-way rejection: paused phase, inactive-side input, sub-150 ms debounce). Export `pause` and `reset` as stubs that `throw new Error("not implemented")` — they are completed in T029 and T037. Use ES modules. No DOM access in this file. Make T011 and T012 pass
- [X] T014 [US1] Add markup inside `<section id="match-screen">` of `index.html`: two clock cards (`<article class="player-card" id="player-1-card">` and `id="player-2-card">`), each containing a `<h2 class="player-name">`, a `<time class="turn-clock" aria-live="polite">`, and a `<time class="reserve-clock">`. Add a hidden `<div class="paused-banner" hidden>PAUSED</div>` and a footer with placeholder Pause and Reset buttons (their wiring lands in US4 / US6 — buttons must exist now to keep layout stable)
- [X] T015 [US1] Create `assets/js/render.js` exporting `render(state)` that updates the DOM only — no logic. Reads `state.match.players[i].turnRemainingMs` / `reserveRemainingMs`, formats as `m:ss` (turn) and `m:ss` (reserve), writes them into the corresponding `<time>` elements, and toggles CSS classes on each `.player-card` according to the six visual states from [contracts/ui-contract.md](contracts/ui-contract.md) §2. Hide `#config-screen` when `match.phase !== "idle"`, hide `#match-screen` when `match.phase === "idle"`
- [X] T016 [US1] Add CSS rules in `assets/css/app.css` for the `.player-card` states: `.player-card.is-inactive`, `.is-active-normal` (Bulma `is-primary` accents + Animate.css `animate__animated animate__pulse animate__infinite`), `.is-active-in-reserve` (warning hue, faster pulse — implement in US3), `.is-active-exhausted` (danger + `animate__shakeX` — implement in US3). For US1 ship at minimum the `is-inactive` and `is-active-normal` styles. Tap targets ≥ 44×44 px (SC-007). Layout: side-by-side on landscape/desktop, stacked top/bottom on portrait phones using `@media (orientation: portrait)` — per FR-018, SC-007
- [X] T017 [US1] Create `assets/js/input.js` exporting `installInput({onEndTurn, onPause})`. Bind `keydown`: key `A` → `onEndTurn(0)`, `L` → `onEndTurn(1)`, `Space` → `onPause()` (call `event.preventDefault()` to suppress page scroll). Ignore events where `event.repeat === true`. Add `pointerup` listeners on `#player-1-card` → `onEndTurn(0)` and `#player-2-card` → `onEndTurn(1)`. Per [contracts/ui-contract.md](contracts/ui-contract.md) §1 and FR-019. **All four inputs (key A, key L, tap on card 1, tap on card 2) always pass the side index unconditionally**; the active-player guard, the paused-phase guard, and the 150 ms debounce all live inside `state.js#endTurn` (T013) and are covered by tests T012(f)(g)(h). `input.js` does no filtering
- [X] T018 [US1] Wire everything in `assets/js/main.js`: import `state.js`, `render.js`, `input.js`, `storage.js`. Hold a single `appState = { config, match }` module-level binding. Initialize `appState.config = loadConfig()` and `appState.match = idleMatch(appState.config)` so `render` always has a valid match shape (phase = `idle`). Implement an animation loop: on every `requestAnimationFrame`, if `appState.match.phase === "running"` call `appState.match = recompute(appState.match, performance.now())` and then `render(appState)`. Install input handlers: `onEndTurn(sideIndex)` → `appState.match = endTurn(appState.match, performance.now(), sideIndex); render(appState)` (the reducer itself rejects inactive-side / paused / debounced calls — no extra guards in main.js). Wire a temporary "Start" button (visible on the config screen — full config form lands in US2; for US1 a single button with hard-coded defaults is acceptable) that calls `appState.match = startMatch(defaultConfig())`. Add a `visibilitychange` listener that calls `recompute(...)` once on return-to-foreground so the displayed time matches wall-clock per FR-017

**Checkpoint**: With hard-coded defaults, two players can play alternating turns; active player is visually obvious; backgrounding a tab for a minute and returning shows correct elapsed time. US1 is independently demoable.

---

## Phase 4: User Story 2 — Configure turn time, reserve pool, and names (Priority: P1)

**Goal**: Replace the hard-coded "Start" button with a real configuration screen with validation and persistence.

**Independent Test**: Set custom values, start, observe clocks reflect them; reload the page and verify the values were remembered; submit invalid values and verify the form blocks start with a clear message.

### Implementation for User Story 2

- [X] T019 [US2] Add the configuration form inside `<section id="config-screen">` in `index.html`: two text inputs (`#cfg-name-1`, `#cfg-name-2`, `maxlength="24"`, placeholders `"Player 1"` / `"Player 2"`), two number inputs for minutes + seconds **OR** a single seconds field with helper text — choose seconds-only with a label "Turn time (seconds)" `#cfg-turn-seconds` (`min="1"`, `max="3600"`, default `240`), and `#cfg-reserve-seconds` (`min="0"`, `max="3600"`, default `0`). Add `#cfg-error` (an empty `<p class="help is-danger" hidden>` for validation messages) and `#start-match-btn`. Use Bulma `is-primary` styling. Per FR-002, FR-003, FR-004
- [X] T020 [US2] Add a config-validation helper inside `assets/js/state.js` (or co-locate in `main.js` if trivial): `validateConfig(rawForm) → { config | error }`. Reject non-numeric, `turnSeconds <= 0`, `turnSeconds > 3600`, `reserveSeconds < 0`, `reserveSeconds > 3600`. Trim names; substitute `"Player 1"` / `"Player 2"` if empty after trim. Per FR-004 and [data-model.md](data-model.md) "Validation rules"
- [X] T021 [US2] In `assets/js/main.js`: on app load, call `loadConfig()` and pre-populate the form fields. On `#start-match-btn` click, read the form, run `validateConfig`. If invalid, show the error in `#cfg-error` and abort. If valid, call `saveConfig(config)`, then `appState.match = startMatch(config)`, then `render`. Per [contracts/ui-contract.md](contracts/ui-contract.md) §3 (write-on-Start, never on keystroke)
- [X] T022 [US2] Add CSS in `assets/css/app.css` to style the configuration screen using Bulma form classes (`.field`, `.label`, `.input`, `.button.is-primary.is-large`). Ensure mobile readability: form is centered, max-width ~480 px on desktop, full width on phones. Per FR-018, SC-007

**Checkpoint**: Users can configure player names, turn time, and reserve pool; values persist across reloads; invalid input is rejected with a visible message; Start cannot proceed on invalid config.

---

## Phase 5: User Story 3 — Reserve pool consumption (Priority: P1)

**Goal**: When the per-turn timer hits 0 and reserve > 0, the active card auto-transitions into the warning state and the reserve pool starts decrementing. When both reach 0, transition into the exhausted state.

**Independent Test**: Configure 10 s turn / 30 s reserve, do not press anything; verify reserve starts ticking after 10 s with a clear color change; configure 5 s turn / 5 s reserve and verify exhausted state is reached and the clock stops at 0:00.

### Tests for User Story 3

- [X] T023 [P] [US3] Extend `tests/state.recompute.test.mjs` (or add `tests/state.reserve.test.mjs` — choose whichever keeps tests under 200 LOC each) with cases: (a) elapsed exactly equal to remaining turn → `turnRemainingMs = 0`, reserve unchanged; (b) elapsed greater than turn but less than turn+reserve → turn 0, reserve decreased by overflow; (c) elapsed greater than turn+reserve → both 0, no negative values; (d) `endTurn` while in reserve resets only `turnRemainingMs` and preserves the reduced `reserveRemainingMs` (verify against US1's T012 expectation, add an in-reserve case if not already present). Per [data-model.md](data-model.md) and FR-010, FR-011, FR-012

### Implementation for User Story 3

- [X] T024 [US3] Add a derived state helper in `assets/js/state.js`: `playerVisualState(player) → "normal" | "in_reserve" | "exhausted"` per the rule in [data-model.md](data-model.md) "PlayerClock". Call it from `render.js` to choose the active-card class
- [X] T025 [US3] Update `render.js` to apply `is-active-in-reserve` when the active player's derived state is `in_reserve`, and `is-active-exhausted` when it is `exhausted`. The reserve clock display must always be visible on each card; while exhausted, both clocks read `0:00`
- [X] T026 [US3] Add CSS in `assets/css/app.css` for `.is-active-in-reserve` (Bulma `is-warning` color tokens, faster Animate.css pulse — `animate__pulse animate__infinite` with `animation-duration: 0.6s`) and `.is-active-exhausted` (Bulma `is-danger`, `animate__shakeX animate__infinite`, `animation-duration: 0.8s`). Both rules suppressed inside the `prefers-reduced-motion` media block — keep color/size differentiation, drop the animation. Per [contracts/ui-contract.md](contracts/ui-contract.md) §2 and R-009

> **Note (D1 fix)**: the previous T024 ("confirm `recompute` already implements the two-tier subtraction") was removed. The two-tier subtraction is required for the in-reserve test in T023 to pass and is therefore implicitly enforced by T013 → T023. Remaining task IDs in Phase 5 were renumbered T024–T026 (formerly T025–T027); downstream IDs are unchanged because they live in later phases.

**Checkpoint**: Reserve pool semantics fully working; the three active-player visual states (normal / in-reserve / exhausted) are clearly distinguishable. **MVP scope reached.**

---

## Phase 6: User Story 4 — Pause and resume (Priority: P2)

**Goal**: `Space` (and on-screen Pause button) freeze whichever clock is running; second press resumes the same player.

**Independent Test**: Start, pause mid-turn, wait 30 s, resume; verify ~0 s elapsed during the pause and the same player resumes.

### Tests for User Story 4

- [X] T028 [P] [US4] Create `tests/state.pauseResume.test.mjs` covering: (a) `pause(match, t1)` while running calls recompute then sets `phase = "paused"` and `turnStartedAtPerfNow = null`; (b) `pause(match, t2)` while paused sets `phase = "running"` and `turnStartedAtPerfNow = t2`; (c) `endTurn` while paused returns the match unchanged; (d) elapsed time during a paused interval is NOT subtracted from any clock when resumed. Per [data-model.md](data-model.md) and FR-014, FR-015

### Implementation for User Story 4

- [X] T029 [US4] Implement `pause(match, now)` in `assets/js/state.js` per its contract in [data-model.md](data-model.md). Make `endTurn` check `phase === "running"` and return the match unchanged otherwise (also covered by T028(c)). Make T028 pass
- [X] T030 [US4] In `assets/js/main.js`, wire `onPause` from `installInput` to `appState.match = pause(appState.match, performance.now()); render(appState)`. Wire the on-screen Pause button (already in the markup from T014) to the same handler. Update the button label to toggle between "⏸ Pause" and "▶ Resume" based on `appState.match.phase`
- [X] T031 [US4] In `assets/js/render.js`, when `match.phase === "paused"`: reveal the `.paused-banner`, add a `.is-paused` class to `<body>` (or to `#match-screen`); hide the banner and remove the class on resume. In `assets/css/app.css`, style `.is-paused .player-card { filter: grayscale(80%); }` and the paused banner as a high-contrast centered overlay. Verify with browser DevTools "Inspect → Accessibility" or a contrast-check extension that clock digits in the paused state still meet WCAG AA 4.5:1 contrast against their background; if grayscale alone drops below 4.5:1, additionally darken the digit color in `.is-paused`. Per [contracts/ui-contract.md](contracts/ui-contract.md) §2 and R-009

**Checkpoint**: Pause/resume works on keyboard and touch with no time leakage during pauses; paused state is unambiguous.

---

## Phase 7: User Story 5 — Phone / touch usability polish (Priority: P2)

**Goal**: Confirm the layout works on phone-sized viewports without horizontal scroll, taps reliably end the active player's turn, and the on-screen Pause control is reachable.

**Independent Test**: Open in a phone viewport (375×667 and 320×568), run a few turns by tap, pause/resume via the on-screen button, no pinch-zoom needed, no horizontal scroll.

### Implementation for User Story 5

- [X] T032 [US5] In `assets/css/app.css`, finalize responsive layout: `@media (max-width: 600px)` stacks the two `.player-card` elements vertically each occupying ~45% of viewport height; the Pause button is fixed at `position: fixed; bottom: 0.5rem;` centered, with a backdrop. `@media (orientation: landscape) and (max-width: 900px)` lays them side-by-side. Verify all interactive controls are ≥ 44×44 CSS px. Per FR-018, SC-007
- [X] T033 [US5] In `index.html`, add `<meta name="theme-color">` matching the app's primary color and confirm `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Add `touch-action: manipulation` on `.player-card` in CSS to remove the 300 ms tap delay
- [X] T034 [US5] In `assets/js/input.js`, ensure pointer handlers use `pointerup` (not `click`) and `event.preventDefault()` to avoid double-firing on touch + emulated mouse events. The active-player guard lives in `endTurn` (T013) and is covered by T012(g) — no additional guard is needed here
- [ ] T035 [US5] Manually run [quickstart.md](quickstart.md) §2.E (steps 16–18) on a real phone or in DevTools device emulation at 320×568, 375×667, and 414×896. Fix any clipping, illegible text, or hidden control discovered

**Checkpoint**: Phone usability validated end-to-end against US5 acceptance scenarios.

---

## Phase 8: User Story 6 — Reset and new match (Priority: P3)

**Goal**: A Reset button returns to the configuration screen, restoring full timers and reserves; previously entered names and configuration are preserved.

**Independent Test**: Start a partial match, click Reset, confirm dialog, verify the config screen reappears with the same values; click Start; verify both timers and reserves are full.

### Tests for User Story 6

- [X] T036 [P] [US6] Add to an existing test file (or create `tests/state.reset.test.mjs`): (a) `reset(match, config)` returns a new match with `phase = "idle"`, both players' `turnRemainingMs = config.turnSeconds * 1000`, both `reserveRemainingMs = config.reserveSeconds * 1000`, `activeIndex = 0`, `turnStartedAtPerfNow = null`; (b) the input `match` is not mutated. Per [data-model.md](data-model.md) and FR-016

### Implementation for User Story 6

- [X] T037 [US6] Implement `reset(match, config)` in `assets/js/state.js` per its contract. Make T036 pass
- [X] T038 [US6] In `assets/js/main.js`, wire the Reset button (already in the markup from T014) to: show `window.confirm("Reset match?")`; on confirm, set `appState.match = reset(appState.match, appState.config)` and call `render(appState)`. The render call returns the user to `#config-screen` because `phase === "idle"`. Per FR-016
- [X] T039 [US6] Verify on the config screen that the previously entered values are still in the inputs after reset (they should be, because `loadConfig`/the in-memory `appState.config` were not touched). Add a small "Clear saved config" link/button on the config screen that calls `localStorage.removeItem("bbtimer.config.v1")` and reloads — explicit user-initiated clear per the assumption in [contracts/ui-contract.md](contracts/ui-contract.md) §3

**Checkpoint**: Reset round-trips cleanly; configuration persists across resets and reloads but can be explicitly cleared.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final accessibility, performance, and acceptance verification.

- [X] T040 [P] Add `aria-live="polite"` (already added in T014) and `aria-label` attributes on the Pause and Reset buttons; confirm visible focus rings are NOT stripped by any custom CSS. Per R-009
- [X] T041 [P] Add `<noscript>This app requires JavaScript to run the chess clock.</noscript>` inside `index.html` for graceful degradation
- [X] T042 Run `node --test tests` and confirm all logic tests pass; fix any failures by editing the implementation, not the tests
- [ ] T043 Run the full manual acceptance walkthrough in [quickstart.md](quickstart.md) §2 (steps A through H) on a desktop browser with DevTools open; confirm SC-003 (drift ≤ ±1 s after 60 s background), SC-005 (load < 2 s on a throttled 4G profile **and the DevTools Network panel shows zero requests after first paint** — a hard reload should also stay under a ~250 KB total transfer budget for `index.html` + vendored CSS + app JS), SC-007 (no horizontal scroll at 320 px). Note any failure and patch
- [ ] T044 [P] Take two screenshots (desktop + mobile) and add them to `README.md`; add the live GitHub Pages URL once available
- [ ] T045 [P] Cold-start sanity check for SC-006: ask one non-developer to open the page with no instructions and time how long they take to (a) end a turn, (b) pause, (c) name the active player. Record the result in `README.md` or a dev note. Not a blocker; informational only — SC-006 is a usability KPI, not a buildable acceptance gate
- [ ] T046 Configure GitHub Pages in repo settings: **Source = `Deploy from a branch`, Branch = `main`, folder = `/ (root)`**, then merge `001-bloodbowl-timer` to `main` (or push directly if working solo). Verify the live site loads, then re-run [quickstart.md](quickstart.md) §2.H (offline check) against the live URL. Per R-007

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → no dependencies, start immediately
- **Foundational (Phase 2)** → depends on Setup; **blocks all user stories**
- **US1 (Phase 3)** → depends on Foundational; first MVP slice; other stories can be built in parallel after this once T013 (`state.js`) exists
- **US2 (Phase 4)** → depends on Foundational; touches `index.html` and `main.js` already created in US1; can run in parallel with US3 (different files)
- **US3 (Phase 5)** → depends on Foundational; reuses `state.js` from T013; can run in parallel with US2 (different responsibilities; minor co-edit risk on `render.js` and `app.css` — coordinate or run sequentially)
- **US4 (Phase 6)** → depends on US1 (needs `state.js` reducers and `input.js` event plumbing)
- **US5 (Phase 7)** → depends on US1 + US4 (touches the same DOM and input layer); can be polished after US4 lands
- **US6 (Phase 8)** → depends on US1 (needs `match` state to reset); can be done any time after US1
- **Polish (Phase 9)** → depends on every desired user story being complete

### User Story Dependencies (intra-feature)

- US1 is the foundational story — once it ships, US2/US3/US4/US6 are independently testable (US3 stacks on US1's `state.js`, US4 stacks on US1's `input.js`, but each is independently demoable)
- US5 specifically validates US1+US4 on phone form factors; it is responsive-CSS-and-input polish, not new functional surface

### Within Each User Story

- Tests (where present) MUST be written and FAIL before the implementation tasks below them in the same phase; this is enforced by the order T011 → T013, T012 → T013, T023 → T013/T024, T028 → T029, T036 → T037 (the in-reserve test T023 verifies behaviour already required by T013; T024 then consumes it)
- `state.js` reducers ship before `render.js` consumers
- `render.js` ships before `main.js` integration
- CSS visual states ship alongside the render code that uses them

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 are all `[P]` — different files, no order dependency
- **Phase 2**: T009 (`storage.js`) is `[P]` and can be written in parallel with T007/T008 (different files)
- **US1**: T011 and T012 are `[P]` (different test files); the implementation order T013 → T014/T015/T016/T017 → T018 is sequential because each depends on the previous
- **US3 vs US2**: can be staffed in parallel by two people; coordinate on `render.js` and `app.css` co-edits
- **Phase 9**: T040 and T041 are `[P]`

---

## Parallel Example: User Story 1

```bash
# After Phase 2 is complete, kick off the two test files in parallel:
#   tests/state.recompute.test.mjs  (T011)
#   tests/state.endTurn.test.mjs    (T012)
# Both fail (state.js does not exist yet) — that is expected.

# Then implement:
#   assets/js/state.js              (T013)
# Re-run: node --test tests
# Both tests pass.

# Then drive in order:
#   index.html match-screen markup  (T014)
#   assets/js/render.js             (T015)
#   assets/css/app.css visuals      (T016)
#   assets/js/input.js              (T017)
#   assets/js/main.js wiring        (T018)
```

---

## Implementation Strategy

**Recommended path** (single developer, ~weekend project):

1. Phase 1 (Setup) and Phase 2 (Foundational) — small, fast, no decisions to make.
2. **MVP cut**: complete US1 → US2 → US3 in that order. After US3, the product satisfies every P1 user story and is demoable end-to-end.
3. Ship MVP to GitHub Pages (jump to T046 early, validate the deploy story).
4. Layer US4 (pause), then US5 (mobile polish), then US6 (reset).
5. Polish phase last.

**Alternative MVP cut** (faster but less complete): US1 + US2 only, with reserve treated as "always 0" — drops the differentiator from a generic chess clock. Not recommended; the user explicitly required the reserve pool feature.

**Tests-first within each phase**: write the `tests/*.test.mjs` for that phase before its implementation tasks. The pure-function design makes this trivially cheap (~10 lines per case) and pays for itself the first time a regression is introduced in `recompute`.

---

## Format validation

All tasks above:

- ✅ Start with `- [ ]` checkbox
- ✅ Have a sequential `T###` ID
- ✅ Use `[P]` only when the task touches a different file from any incomplete prior task
- ✅ Use `[USn]` labels in user-story phases (Phases 3–8); no story labels in Setup, Foundational, or Polish
- ✅ Reference exact file paths from [plan.md](plan.md) "Project Structure"
