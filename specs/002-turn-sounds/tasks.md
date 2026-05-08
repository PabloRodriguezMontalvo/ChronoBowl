---
description: "Task list for Turn-Transition Sound Cues feature"
---

# Tasks: Turn-Transition Sound Cues

**Input**: Design documents from `/specs/002-turn-sounds/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/audio-contract.md](contracts/audio-contract.md), [quickstart.md](quickstart.md)

**Tests**: Pure-function tests are included because the existing project established the convention (research.md R-008 in feature 001 → continued here). Audio playback fidelity is validated via the manual quickstart §3, not automated DOM tests.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently. The MVP is **US1 + US2** (both P1 — without both, the user's two-cue request is not satisfied). US3 (mute) is P2.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1…US3); omitted in Setup, Foundational, and Polish phases
- File paths are exact and rooted at the repository root

## Path Conventions

Continues the flat static layout from feature 001. Source files at repo root:

- `index.html`
- `assets/css/app.css`
- `assets/js/{main,state,render,input,storage,audio}.js`
- `assets/audio/{enter-reserve,exhausted}.{ogg,mp3}` (NEW)
- `tests/*.test.mjs`
- `LICENSE-AUDIO.md` (NEW, repo root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Acquire and license the royalty-free audio assets and create the new asset folder. No code changes yet.

- [X] T001 Create the directory `assets/audio/` at the repository root (with a `.gitkeep` if your shell strips empty folders)
- [X] T002 [P] Source the **`enterReserve`** cue: download a single short royalty-free sound (≤ 500 ms, soft / gentle, ideally a soft chime, bell, or notification ding) from one of the approved sources in [research.md](research.md) R-002 (Pixabay Sound Effects, freesound.org filtered to CC0, or Mixkit). Save it as `assets/audio/enter-reserve.ogg` and `assets/audio/enter-reserve.mp3` (transcode in Audacity if the source provides only one format). If the source is longer than 500 ms, trim it once locally before committing
- [X] T003 [P] Source the **`exhausted`** cue: same procedure as T002 but the sound MUST be perceptibly distinct from `enterReserve` (different pitch / pattern / timbre) per FR-013. Save as `assets/audio/exhausted.ogg` and `assets/audio/exhausted.mp3`. Both files together with T002's must total ≤ 50 KB on disk to satisfy SC-007
- [X] T004 Create `LICENSE-AUDIO.md` at the repository root listing, for each of the four audio files committed in T002 + T003: filename in repo, source URL, source platform, license name, author (if shown by source), and download date. Format as a table — see [contracts/audio-contract.md](contracts/audio-contract.md) §2 "Licensing requirements"
- [X] T005 Verify the cumulative size of `assets/audio/` (run `Get-ChildItem assets\audio -Recurse | Measure-Object -Property Length -Sum`) and confirm it is ≤ 50 KB. If it exceeds the budget, re-encode at a lower bitrate (mono 64 kbps is plenty for short cues) until under budget

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the storage helper for audio prefs and the pure transition-detection helper. Both are prerequisites for all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 [P] Extend `assets/js/storage.js` with two new exports: `loadAudioPrefs()` reads `localStorage["bbtimer.audio.v1"]`, validates `schemaVersion === 1` and that `muted` is a boolean, returns `{ schemaVersion: 1, muted: false }` on any failure; `saveAudioPrefs(prefs)` writes the JSON. Per [data-model.md](data-model.md) "Persistent state" and [research.md](research.md) R-007. Do NOT touch `loadConfig` / `saveConfig` — the storage namespaces are intentionally independent
- [X] T007 [P] Add the pure helper `derivePlayerVisualStateDelta(prevMatch, nextMatch)` to `assets/js/state.js` per [data-model.md](data-model.md) "Pure transitions". For each player index `i ∈ {0,1}`, compare `playerVisualState(prev.players[i])` vs `playerVisualState(next.players[i])` and return the appropriate tags from `{"p1:enteredReserve","p1:enteredExhausted","p2:enteredReserve","p2:enteredExhausted"}`. Order: p1 then p2. The helper MUST handle the `normal → exhausted` background-skip case by emitting only `enteredExhausted`. Pure: no DOM, no time, no `localStorage`. Make T009 pass

---

## Phase 3: User Story 1 — "Entering reserve" cue (Priority: P1) 🎯 MVP slice 1

**Goal**: When the active player's per-turn timer first hits 0 and reserve > 0, play the soft cue exactly once.

**Independent Test**: Configure 5 s turn / 30 s reserve; start; look away; hear a single short sound at ~5 s; wait 10 s more and hear nothing else.

### Tests for User Story 1

- [X] T008 [P] [US1] Create `tests/state.visualStateDelta.test.mjs` covering the pure helper `derivePlayerVisualStateDelta`: (a) `normal → normal` for both players returns `[]`; (b) `normal → in_reserve` for p1 returns `["p1:enteredReserve"]`; (c) `in_reserve → exhausted` for p2 returns `["p2:enteredExhausted"]`; (d) `normal → exhausted` directly (background-skip) returns ONLY `enteredExhausted` (no `enteredReserve`); (e) staying in `in_reserve` or `exhausted` returns `[]`; (f) the inactive player not transitioning while the active player does → only the active player's tag is emitted; (g) order of returned tags is p1 first, then p2 when both transition simultaneously. Use `node:test` and `node:assert/strict`
- [X] T009 [P] [US1] Create `tests/audio.cueTrigger.test.mjs`. Import the `createAudio` factory (T010) with stub `playCue` (collects calls into an array) and stub `prefs` (in-memory `{load, save}` over a local object). Cover for US1 only: (a) first `fireForDelta(["p1:enteredReserve"])` calls `playCue("enterReserve")`; (b) immediate second call with the same tag does NOT call again; (c) `fireForDelta([])` is a no-op; (d) `fireForDelta(["p2:enteredReserve"])` then `fireForDelta(["p1:enteredReserve"])` calls `playCue("enterReserve")` twice (different player flags); (e) after `handleEndTurn()`, both per-player flags are cleared so a subsequent `fireForDelta(["p1:enteredReserve"])` plays again. (Mute and exhausted-cue assertions land in US3 / US2 respectively but are added to this same file.) Per [contracts/audio-contract.md](contracts/audio-contract.md) §7

### Implementation for User Story 1

- [X] T010 [US1] Create `assets/js/audio.js` exporting a single factory `createAudio({ playCue, prefs } = {})`. Internal state per [data-model.md](data-model.md) "AudioRuntime": `prefs` (loaded from `prefs.load()` or `loadAudioPrefs()`), `unlocked: false`, `triggered: { "p1:enteredReserve":false, "p1:enteredExhausted":false, "p2:enteredReserve":false, "p2:enteredExhausted":false }`, and `elements: {}`. The `playCue` parameter, when omitted, defaults to a real implementation that picks the right preloaded `<audio>` element by cue ID, calls `audio.currentTime = 0; audio.play().catch(()=>{})`. The `prefs` parameter, when omitted, defaults to `{ load: loadAudioPrefs, save: saveAudioPrefs }`. Build the two `HTMLAudioElement`s on factory construction with `new Audio(...)`, set `volume = 0.5`, set `preload = "auto"`. Use the `.canPlayType('audio/ogg; codecs="vorbis"')` feature-detect to choose between `.ogg` (preferred) and `.mp3` for `audio.src`. Wrap any thrown construction errors in try/catch (FR-010). Methods: `unlock()` (idempotent — if `!unlocked`, call `play()/pause()` on each element with `.catch(()=>{})` to satisfy autoplay policy, then set `unlocked = true`); `fireForDelta(tags)` (for each tag, if `!triggered[tag] && !prefs.muted`, call `playCue(cueId)` where `cueId = tag.endsWith("enteredReserve") ? "enterReserve" : "exhausted"`, set `triggered[tag] = true`); `handleEndTurn()` (clear all 4 flags); `handleReset()` (clear all 4 flags); `handleMatchStart()` (clear all 4 flags AND call `unlock()`); `setMuted(muted)` (mutate `prefs.muted`, call `prefs.save(prefs)`); `getMuted()`. Make T009 pass for US1 cases (a)-(e)
- [X] T011 [US1] Wire `audio.js` into `assets/js/main.js`: import `createAudio` and `derivePlayerVisualStateDelta`. Construct `const audio = createAudio()` once at module load. Track `let prevMatch = appState.match` outside the rAF tick. Inside the tick, AFTER the `recompute` step but BEFORE `render`, compute `const tags = derivePlayerVisualStateDelta(prevMatch, appState.match); if (tags.length) audio.fireForDelta(tags); prevMatch = appState.match;`. In the form-submit handler (where `startMatch` is called), insert `audio.handleMatchStart()` immediately after assigning the new match. In the `endTurn` handler, insert `audio.handleEndTurn()` immediately after the state assignment. In the reset confirm-handler, insert `audio.handleReset()` immediately after the state assignment

**Checkpoint**: With 5 s turn / 30 s reserve, exactly one short sound plays at the moment the turn timer first reaches zero. No retrigger. Subsequent end-turn → next player's per-segment flags reset correctly. US1 independently demoable.

---

## Phase 4: User Story 2 — "Exhausted" cue (Priority: P1) 🎯 MVP slice 2

**Goal**: A second, perceptually distinct sound when both timers reach 0. Reuses the audio module from US1; only adds the trigger and asserts the strict-mode + background-skip semantics.

**Independent Test**: Configure 3 s turn / 5 s reserve; start; wait quietly; hear two distinct sounds (the soft one at ~3 s, then the exhausted one at ~8 s). Then configure 3 s turn / 0 s reserve and verify only the exhausted sound plays.

### Tests for User Story 2

- [X] T012 [P] [US2] Extend `tests/audio.cueTrigger.test.mjs` (the file created in T009) with: (a) `fireForDelta(["p1:enteredExhausted"])` calls `playCue("exhausted")` exactly once; (b) repeated calls with the same tag do not retrigger; (c) sequence `fireForDelta(["p1:enteredReserve"])` → `fireForDelta(["p1:enteredExhausted"])` produces play log `["enterReserve","exhausted"]` in that order; (d) sequence with simultaneous tags `fireForDelta(["p1:enteredReserve","p1:enteredExhausted"])` is allowed and produces `["enterReserve","exhausted"]` (this covers strict-mode-not-applicable). For the strict-mode + background-skip semantics, the corresponding test belongs to T008(d) at the delta level — assert here at the audio level via (e): given a delta of `["p1:enteredExhausted"]` only (no `enteredReserve`), the play log is `["exhausted"]` only

### Implementation for User Story 2

- [X] T013 [US2] No code changes required in `audio.js` — the factory built in T010 already handles every tag including `enteredExhausted`. Verify by running tests: `node --test tests` should pass T012 against the existing T010 implementation. If a test fails, fix `audio.js` to make it pass. Document this task as "verification only" in the commit message

**Checkpoint**: Both cues play correctly in all transition orderings, including strict mode and the tab-background skip. **MVP scope reached.**

---

## Phase 5: User Story 3 — Mute toggle (Priority: P2)

**Goal**: An on-screen toggle on the match screen silences both cues; preference persists across reloads.

**Independent Test**: Click the toggle, run a short match through both cues, hear nothing; reload, start a fresh match, the toggle is still ON (silenced); toggle OFF, reload again, confirm OFF persists.

### Tests for User Story 3

- [X] T014 [P] [US3] Extend `tests/audio.cueTrigger.test.mjs` with mute coverage: (a) `setMuted(true)` followed by `fireForDelta` with any tag → `playCue` NOT called; (b) `setMuted(true)` then `setMuted(false)` then `fireForDelta(["p1:enteredReserve"])` → `playCue` called once; (c) `setMuted(true)` writes `{schemaVersion:1, muted:true}` via the injected `prefs.save`; (d) constructing `createAudio` with `prefs.load()` returning `{schemaVersion:1, muted:true}` makes `getMuted() === true` from the start; (e) `getMuted()` returns the current state at any time

### Implementation for User Story 3

- [X] T015 [US3] In `index.html`, add a third button to the existing `<div class="match-controls">` group (between Pause and Reset is fine, or after Reset — pick whichever keeps the visual flow logical). Use: `<button id="mute-btn" class="button is-light is-medium" type="button" aria-label="Silenciar notificaciones de audio" aria-pressed="false">🔊 Sonido</button>`. Per [research.md](research.md) R-009
- [X] T016 [US3] In `assets/js/render.js`, add `mute-btn` to the cached DOM lookups, then inside `render(appState)` update its label and `aria-pressed`: when muted → label `🔇 Silencio`, `aria-pressed="true"`; when not muted → label `🔊 Sonido`, `aria-pressed="false"`. Read the muted state from a new `appState.muted` boolean (which `main.js` will populate from the audio module). The button is always visible while the match screen is visible
- [X] T017 [US3] In `assets/js/main.js`: after constructing `audio`, set `appState.muted = audio.getMuted()`. Bind the mute button's click: `muteBtn.addEventListener("click", () => { audio.setMuted(!audio.getMuted()); appState.muted = audio.getMuted(); render(appState); });`. The `render` call ensures the button label updates without waiting for the next rAF frame
- [X] T018 [P] [US3] Add CSS in `assets/css/app.css` if needed to give the mute button consistent styling with the existing Pause/Reset buttons (Bulma `.button.is-light.is-medium` already does most of the work — likely no rule needed). Verify the focus ring is preserved per the existing T040 polish rule from feature 001. If on mobile the third button overflows the controls row, add a small `flex-wrap: wrap;` to `.match-controls`

**Checkpoint**: Mute toggle works, persists across reloads, and is accessible (`aria-pressed`).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final accessibility, performance, and acceptance verification.

- [X] T019 [P] Run `node --test tests` and confirm all tests pass — including the 28 from feature 001 PLUS the new ones from T008, T009, T012, T014. Fix any failures by editing the implementation, not the tests
- [ ] T020 Run the full manual acceptance walkthrough in [quickstart.md](quickstart.md) §3 (steps A through I) on a desktop browser with DevTools open. Confirm no console errors at any step. Per spec SC-001, SC-002, SC-003, SC-004, SC-005
- [ ] T021 Cross-browser smoke: run §3.A and §3.B from [quickstart.md](quickstart.md) in Chrome/Edge, Firefox, and Safari (desktop). On each, confirm both cues are audible after the user has clicked "Iniciar partida". For Safari, confirm the unlock sequence works
- [ ] T022 Mobile check: open the live site or a local server tunneled to a phone. Run §3.A and §3.B with the phone NOT in silent mode. Confirm both cues play, the mute toggle is reachable on the small screen (the responsive `.match-controls` adjustments should already accommodate three buttons; if not, fix in this task)
- [ ] T023 [P] License audit per [quickstart.md](quickstart.md) §5: open `LICENSE-AUDIO.md` and spot-check one of the source URLs to confirm it still resolves and the license badge is unchanged from what we recorded
- [X] T024 [P] Update the repo `README.md`: add a one-line note in the project layout block about `assets/audio/` and a one-paragraph "Audio cues" section in the body explaining the two cues, the mute toggle, and pointing readers to `LICENSE-AUDIO.md`
- [X] T025 Bundle-size sanity check for SC-007: load the deployed (or locally served) site in DevTools → Network → Disable cache → reload. Confirm the total transferred bytes for first load did not increase by more than ~50 KB compared to the pre-feature-002 baseline. The existing baseline was documented in feature 001's quickstart §2.H budget (~250 KB for `index.html` + vendored CSS + app JS); the new ceiling is ~300 KB
- [ ] T026 Deploy: commit the `002-turn-sounds` branch, merge to `main` (or push if working solo), and verify the live site at <https://pablorodriguezmontalvo.github.io/ChronoBowl/> plays both cues end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → no code dependencies; can start immediately
- **Foundational (Phase 2)** → depends on Setup (assets must exist for `audio.js` to load them later, although T006 and T007 themselves do not require the assets to be present — only the manual quickstart does); blocks all user stories
- **US1 (Phase 3)** → depends on Foundational
- **US2 (Phase 4)** → depends on US1 (reuses the same `audio.js`); independent test still independent because US1's verification covers only the `enterReserve` path
- **US3 (Phase 5)** → depends on US1 (reuses the same `audio.js`); independent of US2
- **Polish (Phase 6)** → depends on whichever stories are in scope (US1 + US2 minimum, US3 if shipped)

### Within-Phase Parallelism

- T002, T003 are parallel (different files)
- T006, T007 are parallel (different files)
- T008, T009 are parallel (different files); T010 must come after at least T009 (the test file references the factory)
- T012 extends an existing test file (T009) → sequential
- T014 also extends T009's file → sequential after T012
- T015–T018 mostly sequential (`render.js`, `index.html`, `main.js`, `app.css` all touch different files but share semantic dependency: render needs the button to exist, main needs render to read the new state field). T018 [P] can run any time after T015

### MVP boundary

US1 + US2 (T001–T013) is the deliverable MVP that satisfies the user's exact request: "two simple, non-disruptive sounds — one for entering the reserve pool, one for the reserve being exhausted." US3 (mute) is a quality-of-tournament-life addition.

## Implementation strategy

1. Acquire and license the assets first (T001–T005). This is the longest non-coding step and unblocks everything else.
2. Land the pure helpers (T006, T007). Trivial, ~10 LOC each, with passing tests.
3. Build the audio module (T010) and wire it into `main.js` (T011). At this point US1 is demoable end-to-end.
4. Verify US2 piggybacks correctly (T012, T013). One test extension, zero code changes.
5. Add the mute toggle (T014–T018). Smallest reasonable UI surface.
6. Polish (T019–T026): tests, manual walkthrough, deploy.

Validation: run `node --test tests` after every code-touching task and reload the live local server after every UI-touching task.
