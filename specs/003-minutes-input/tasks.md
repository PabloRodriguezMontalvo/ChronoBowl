---
description: "Task list for the 'Configure timers in minutes' feature"
---

# Tasks: Configure timers in minutes

**Input**: Design documents from `/specs/003-minutes-input/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/form-contract.md](contracts/form-contract.md), [quickstart.md](quickstart.md)

**Tests**: One small unit-test file is added because the only new pure-logic
behavior (the integer-minute guard) is covered by a `node --test` test, per
the project convention from features 001/002. The DOM-side adapter changes
in `main.js` are exercised by the manual quickstart §3.

**Organization**: Two priority-tagged user stories, both P1, are intentionally
implemented together — US1 without US2 ships seconds-worded validation
messages alongside minute inputs, which is worse than not shipping. Both
together form the single MVP slice.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Which user story (US1 or US2)
- File paths are exact and rooted at the repository root

## Path Conventions

Continues the flat single-project layout from features 001/002:

- `index.html`
- `assets/js/{main,state,render,input,storage,audio}.js`
- `assets/css/app.css`
- `tests/*.test.mjs`

---

## Phase 1: Setup

**Purpose**: None required. No new directories, no new dependencies, no
license artifacts. Skip directly to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the validator change first because it is pure, testable
in isolation, and unblocks both user stories.

**⚠️ CRITICAL**: All Phase-3 / Phase-4 tasks depend on T002.

- [ ] T001 [P] Create `tests/state.validateConfig.test.mjs` covering the new
  integer guard and the new error wording. Cases (use `node:test` and
  `node:assert/strict`):
  (a) `validateConfig({turnSeconds: 240, reserveSeconds: 300, player1Name:"a", player2Name:"b"})`
  returns `{config}` with both seconds intact;
  (b) `validateConfig({turnSeconds: 0, reserveSeconds: 0, ...})` returns an
  `error` mentioning "1 minuto";
  (c) `validateConfig({turnSeconds: -60, reserveSeconds: 0, ...})` returns an
  error mentioning "minutos" (not segundos);
  (d) `validateConfig({turnSeconds: 90, reserveSeconds: 0, ...})` returns an
  error containing "número entero de minutos" (90 is not a multiple of 60);
  (e) `validateConfig({turnSeconds: 240, reserveSeconds: 30, ...})` returns the
  same "número entero de minutos" error (reserve fails the integer-minute
  guard);
  (f) `validateConfig({turnSeconds: 4200, reserveSeconds: 0, ...})` returns an
  error mentioning "60 minutos" (upper bound);
  (g) `validateConfig({turnSeconds: 60, reserveSeconds: 0, ...})` returns
  `{config}` (1 minute strict mode is valid). Make T002 pass

- [ ] T002 Update `validateConfig(raw)` in `assets/js/state.js`:
  (i) reword every error message per [data-model.md](data-model.md) "Validator surface change"
  (lower bound says "al menos 1 minuto", upper bound says "60 minutos",
  reserve message stays in minutes too);
  (ii) **after** the existing positive/upper-bound checks, add a guard:
  `if (turnSeconds % 60 !== 0 || reserveSeconds % 60 !== 0) return { error: "Introduce un número entero de minutos." }`;
  (iii) reduce the upper bound from `3600` to `3600` (unchanged numerically —
  the 60-minute ceiling is the same number of seconds). Do NOT rename the
  `turnSeconds`/`reserveSeconds` parameters; the validator still operates
  in seconds — only its error wording changes. Keep returning the same
  `{config}` shape with `Math.floor`. Make T001 pass

**Checkpoint**: `node --test tests` passes 54 + 7 new = 61 tests. The
validator now talks to the user in minutes and rejects non-integer-minute
inputs, but the form is still in seconds — no user-visible change yet.

---

## Phase 3: User Story 1 — Configure per-turn time in minutes (Priority: P1) 🎯 MVP slice 1

**Goal**: The form's two timer inputs read and write minutes; defaults
become 4 / 5; reload round-trips through the seconds-storage transparently.

**Independent Test**: Open the app in a private window. Confirm fields show
`4` and `5` with `(minutos)` labels. Type `3` and `4`, click "Crear partida"
then "▶ Empezar". Active player's turn reads `3:00` and reserve `4:00`.
Reload — fields show `3` and `4` (not `180` / `240`).

### Implementation for User Story 1

- [ ] T003 [US1] Edit [index.html](../../index.html) per [contracts/form-contract.md](contracts/form-contract.md):
  (i) the per-turn `<label>` text from `Tiempo por turno (segundos)` →
  `Tiempo por turno (minutos)`;
  (ii) on `#cfg-turn-seconds` change `min="1"` → `min="1"`,
  `max="3600"` → `max="60"`, `value="240"` → `value="4"` (defaults from FR-007);
  (iii) the per-turn `<p class="help">` text from `Por defecto: 240 (4 minutos).` →
  `Por defecto: 4 minutos.`;
  (iv) the reserve `<label>` text from `Tiempo de reserva (segundos)` →
  `Tiempo de reserva (minutos)`;
  (v) on `#cfg-reserve-seconds` change `max="3600"` → `max="60"`,
  `value="0"` → `value="5"` (default from FR-007);
  (vi) leave the reserve `<p class="help">` text alone (it never mentioned
  the unit). Do NOT rename the element ids — the `*-seconds` ids are
  internal vocabulary and preserving them avoids touching unrelated
  cached lookups in `main.js`

- [ ] T004 [US1] In [assets/js/main.js](../../assets/js/main.js), update
  `populateForm(config)` so the two number inputs receive **minutes**:
  replace
  `turnInput.value = String(config.turnSeconds);` with
  `turnInput.value = String(Math.round((config.turnSeconds || 0) / 60));`
  and the same transformation for `reserveInput.value`. The `Math.round`
  tolerates legacy values that are not exact multiples of 60 (R-004).

- [ ] T005 [US1] In the same file, update `readForm()` to convert the inputs
  from minutes to seconds before passing them to `validateConfig`:
  replace the existing
  `turnSeconds: turnInput.value`
  and
  `reserveSeconds: reserveInput.value`
  with
  `turnSeconds: Number(turnInput.value) * 60`
  and
  `reserveSeconds: Number(reserveInput.value) * 60`.
  Empty inputs become `NaN * 60 = NaN`, which `validateConfig` already
  rejects with the "número entero positivo de minutos" message.

- [ ] T006 [US1] Verify SC-002 by `grep_search`-ing the repo for
  `segundos|seconds` and confirming the only remaining occurrences are
  inside `assets/js/state.js` (parameter names — internal) and the
  `specs/` directory (history). No occurrences in `index.html`. If any
  user-visible "segundos" text remains, fix it in this task.

**Checkpoint**: US1 fully demoable end-to-end. Form shows minutes,
defaults are 4 / 5, reload round-trips, the running match displays
`m:00` for the entered minute value.

---

## Phase 4: User Story 2 — Validation in the new unit (Priority: P1) 🎯 MVP slice 2

**Goal**: Error messages refer to minutes, fractional values are rejected.

**Independent Test**: Empty per-turn → submit → error mentions "minutos".
Type `0` → submit → error says "al menos 1 minuto". Type `1.5` → submit →
error says "número entero de minutos".

### Implementation for User Story 2

- [ ] T007 [US2] **Verification only** — no code changes. T002 already
  reworded every message and added the integer-minute guard; T005 already
  multiplies the form value by 60 before handing it to `validateConfig`,
  so a user-typed `1.5` becomes `90`, which fails the
  `% 60 !== 0` guard and surfaces the "Introduce un número entero de
  minutos." message verbatim. Run the manual scenarios from
  [quickstart.md](quickstart.md) §3.D and confirm each error matches.
  If any manual case surfaces an unexpected English/seconds string,
  patch `validateConfig` in this task to fix it.

**Checkpoint**: **MVP scope reached.** Both user stories pass their
independent tests; the entire feature is shippable.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T008 [P] Run `node --test tests` and confirm **61** tests pass
  (54 pre-existing + 7 new from T001). Fix the implementation, not
  the tests, if any fail
- [ ] T009 Run the full manual walkthrough in [quickstart.md](quickstart.md)
  §3 (steps A–F) on Chrome/Edge with DevTools open. Confirm zero
  console errors at any step. Per spec SC-001, SC-002, SC-004
- [ ] T010 [P] Cross-browser smoke: repeat §3.A and §3.B in Firefox.
  Confirm whole-minute-only validation fires (Firefox is more
  permissive than Chrome about typed fractional values, which is
  exactly why the JS-side `% 60` guard exists)
- [ ] T011 [P] Mobile check: load on a phone and confirm the number
  spinners on the timer fields cap at `60` and the labels read
  `(minutos)` legibly
- [ ] T012 [P] Backward-compat manual check (SC-004): in DevTools set
  `localStorage["bbtimer.config.v1"]` to a legacy
  `{...,"turnSeconds":240,"reserveSeconds":300}` and reload. Confirm
  the form shows `4` and `5`, not `240` and `300`
- [ ] T013 [P] Update README.md if it mentions seconds-based defaults
  anywhere (search for `240` or `segundos`); reword to minute terms.
  If no such mention exists, this task is a no-op
- [ ] T014 Deploy: commit the `003-minutes-input` branch, merge to
  `main`, and verify the live site at <https://pablorodriguezmontalvo.github.io/ChronoBowl/>
  shows the new minute-based form

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → none
- **Foundational (Phase 2)** → T001 ∥ T002 (both create the test↔code pair;
  in practice land T001 first to keep RED→GREEN, then T002)
- **US1 (Phase 3)** → depends on T002 (validator must accept the new
  integer-minute guard before the form can reliably submit)
- **US2 (Phase 4)** → depends on T002 (verification only); independent of
  US1 in code but the manual test needs US1's UI to demonstrate
- **Polish (Phase 5)** → depends on US1 + US2

### Within-Phase Parallelism

- T001, T002 are listed as a sequential pair (red-green); if you trust
  the validator change you can write them in either order
- T003–T006 share `index.html` and `main.js` so they are sequential within
  the file but the trio T003+T004+T005 can be reviewed together
- All Phase-5 polish tasks marked [P] are independent

### MVP boundary

US1 + US2 (T001–T007) is the deliverable MVP. Polish (T008–T014) is
recommended-on-merge but not blocking the user-facing change.

## Implementation strategy

1. Land T001 (test) then T002 (validator) — pure-logic change, runs offline.
2. Edit the form in T003, then thread the conversion into `main.js` in
   T004 and T005. After this point the running app already speaks minutes.
3. Run T006 + T007 for verification. If either surfaces a wording miss,
   patch in place — the surface area is tiny.
4. Polish (T008–T014): tests, manual walkthrough, deploy.
