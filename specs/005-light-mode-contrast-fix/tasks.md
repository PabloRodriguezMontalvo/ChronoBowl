---
description: "Tasks for feature 005 — light-mode contrast fix (dual-theme)"
---

# Tasks: Light-mode contrast fix (dual-theme)

**Input**: Design documents from `/specs/005-light-mode-contrast-fix/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md), [quickstart.md](quickstart.md)

**Tests**: This feature is presentation-only. No new automated tests are added (per plan.md and spec Q5). Verification is a **manual axe DevTools / Lighthouse audit** recorded in `quickstart.md`. The existing `node --test tests` suite is the regression harness.

**Organization**: Tasks are grouped by user story (US1 = polished light variant, US2 = brand identity preserved). Each story is independently testable.

**Analysis remediation**: This regeneration folds in three findings from the prior `/speckit.analyze` pass:

- **C1 (HIGH)** — added an explicit dark-theme axe-audit task (T024).
- **A2 (MEDIUM)** — introduced `--color-button-light-bg / -fg / -border` tokens, threaded through T013/T014 and the contract.
- **T1 (LOW)** — markdown links to `assets/css/app.css` now use the workspace-relative `../../assets/css/app.css` form.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files / no dependencies on incomplete tasks).
- **[Story]**: User story label (US1, US2). Setup, Foundational and Polish phases have no story label.

## Path Conventions

Single static-site layout (per [plan.md](plan.md) → "Project Structure"):

- Stylesheet: [../../assets/css/app.css](../../assets/css/app.css) (the only file edited by this feature).
- Vendor stylesheets: [../../assets/vendor/bulma.min.css](../../assets/vendor/bulma.min.css), [../../assets/vendor/animate.min.css](../../assets/vendor/animate.min.css) (read-only — never edited).
- HTML: [../../index.html](../../index.html) (read-only — untouched).
- JS: `../../assets/js/*.js` (read-only — untouched).
- Tests: `../../tests/*.test.mjs` (read-only — untouched).
- Specs: this feature directory.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the regression baseline and serve the app locally so every later task can be visually verified.

- [X] T001 Capture baseline regression in [quickstart.md](quickstart.md) by running `node --test tests` from the repo root and noting the current pass count in the audit checklist's "Definition of done" section so the post-implementation run can be compared against it. **Result: 77 pass / 0 fail.**
- [ ] T002 [P] Start a local static server with `python -m http.server 8000` (per [quickstart.md](quickstart.md) §1) and confirm `http://localhost:8000/` renders the existing dark theme correctly. Leave the server running for use by later tasks.
- [ ] T003 [P] In a Chromium-based browser, open DevTools → *Rendering* → **Emulate CSS media feature `prefers-color-scheme`**, switch it to `light`, reload the app, and capture a "before" screenshot of both the configuration screen and the match screen (any state) to this feature directory (file names: `before-light-config.png`, `before-light-match.png`) so the post-fix audit has a visual diff reference. *(Screenshots are local artifacts — do NOT commit; this task is an evidence-capture step only.)*

**Checkpoint**: Baseline captured. Local server running. The current white-on-white bug is observable and documented.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor the existing single-theme stylesheet into a token-driven layout that future user-story phases can override per theme. This phase **must complete before either user story** because both stories share the token table.

**⚠️ CRITICAL**: No US1 or US2 task may begin until Phase 2 is done.

- [X] T004 In [../../assets/css/app.css](../../assets/css/app.css), declare `color-scheme: dark light;` inside the existing `:root` block (top of the file, just before the `--color-purple-deep` declaration). Per [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §3.
- [X] T005 In [../../assets/css/app.css](../../assets/css/app.css), inside the same `:root` block, add the new **role tokens** with their dark-theme default values exactly as listed in [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §2: `--color-page-bg`, `--color-page-fg`, `--color-page-fg-muted`, `--color-link`, `--color-link-hover`, `--color-card-inactive-bg`, `--color-card-inactive-fg`, `--color-form-box-bg`, `--color-form-box-border`, `--color-form-box-shadow`, `--color-controls-bar-bg`, `--color-controls-bar-border`. Do NOT remove or rename the pre-existing brand tokens — they stay untouched (theme-invariant per contract §1). The `--color-button-light-*` tokens are **light-theme-only** and are introduced in T013 inside the `@media` block; the dark `:root` does NOT redeclare them (they fall back to Bulma's default for `.button.is-light`).
- [X] T006 In [../../assets/css/app.css](../../assets/css/app.css), migrate the rule body of `body { … }` to use `background: var(--color-page-bg); color: var(--color-page-fg);` instead of the current `var(--color-purple-deep)` / `var(--color-white)` literals. The dark theme MUST render identically after this migration (visually verify against the running server from T002).
- [X] T007 In [../../assets/css/app.css](../../assets/css/app.css), migrate `#config-screen .title`, `#config-screen .subtitle`, and the four `#config-screen .content / .content p / .content .has-text-grey / .has-text-grey` rules to use `var(--color-page-fg)` (title) and `var(--color-page-fg-muted)` (subtitle, content variants — keep the existing `!important`). Visually verify the dark theme is unchanged.
- [X] T008 In [../../assets/css/app.css](../../assets/css/app.css), migrate `#config-screen a` and its `:hover, :focus` rule to use `var(--color-link)` and `var(--color-link-hover)` respectively. Visually verify the dark theme is unchanged.
- [X] T009 In [../../assets/css/app.css](../../assets/css/app.css), migrate `#config-form.box` to use `var(--color-form-box-bg)`, `var(--color-form-box-border)` (in the `border` shorthand) and `var(--color-form-box-shadow)`. Visually verify the dark theme is unchanged.
- [X] T010 In [../../assets/css/app.css](../../assets/css/app.css), migrate the default `.player-card` rule to use `background: var(--color-card-inactive-bg); color: var(--color-card-inactive-fg);` (replacing the current `var(--color-inactive-bg)` / `var(--color-inactive-fg)` references). The pre-existing `--color-inactive-bg` / `--color-inactive-fg` tokens may either be (a) kept as deprecated aliases pointing to the new tokens, or (b) removed if no other rule consumes them — search the file with `grep -n "color-inactive" assets/css/app.css` and pick the option that leaves zero dangling references. Visually verify the dark theme is unchanged.
- [X] T011 In [../../assets/css/app.css](../../assets/css/app.css), migrate the `.match-controls` rule to use `background: var(--color-controls-bar-bg); border-top-color: var(--color-controls-bar-border);` (or the appropriate `border-top` shorthand). Visually verify the dark theme is unchanged.
- [X] T012 Run `node --test tests` from the repo root and confirm the pass count matches the T001 baseline. Re-load the running app in the browser (still in the default dark theme via DevTools `prefers-color-scheme: dark`) and visually confirm that the configuration screen and the match screen look bit-for-bit identical to the pre-T004 screenshots — i.e. the foundational refactor is a no-op visually.

**Checkpoint**: The stylesheet now resolves every themed value through a role token. The dark theme is preserved. The light theme is still broken (Bulma's leaks unchanged) — that is fixed in US1.

---

## Phase 3: User Story 1 — Polished light variant (Priority: P1) 🎯 MVP

**Goal**: When the browser reports `prefers-color-scheme: light`, the app renders a deliberately-designed light theme — light-tinted-purple page, dark body text, brand purple/gold accents preserved — and every text element on both screens meets WCAG AA contrast.

**Independent Test**: Switch DevTools `prefers-color-scheme` to `light`, reload the app, walk through audit cells 3, 4, and 12–18 in [quickstart.md](quickstart.md) §4, and confirm axe DevTools / Lighthouse reports zero color-contrast violations on each cell.

### Implementation for User Story 1

- [X] T013 [US1] In [../../assets/css/app.css](../../assets/css/app.css), add a new `@media (prefers-color-scheme: light) { :root { … } }` block immediately after the closing brace of the existing `:root` block. Inside it, redeclare the **role tokens** (and ONLY the role tokens — never the brand tokens) with their light-theme values exactly as listed in [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §2: `--color-page-bg: hsl(252, 30%, 96%)`, `--color-page-fg: #1a1a1a`, `--color-page-fg-muted: hsla(0,0%,0%,0.65)`, `--color-link: var(--color-gold-deep)`, `--color-link-hover: hsl(40,75%,35%)`, `--color-card-inactive-bg: hsl(252,15%,88%)`, `--color-card-inactive-fg: hsl(0,0%,20%)`, `--color-form-box-bg: var(--color-white)`, `--color-form-box-border: hsla(45,85%,60%,0.55)`, `--color-form-box-shadow: 0 4px 16px rgba(31,13,77,0.12)`, `--color-controls-bar-bg: hsl(0,0%,100%)`, `--color-controls-bar-border: hsla(252,30%,40%,0.18)`. Also declare the three **light-theme-only** button tokens: `--color-button-light-bg: hsl(252, 25%, 88%)`, `--color-button-light-fg: hsl(0, 0%, 15%)`, `--color-button-light-border: hsla(252, 30%, 40%, 0.35)`.
- [X] T014 [US1] In the same `@media (prefers-color-scheme: light)` block, add an explicit Bulma override for `.button.is-light`: `background-color: var(--color-button-light-bg); color: var(--color-button-light-fg); border-color: var(--color-button-light-border);` (per [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §4 last row). The rule body uses **only** the tokens introduced in T013 — no literal hex/HSL appears here. If the manual axe audit (T015/T016) shows a contrast failure on `#reset-btn` or `#mute-btn`, tune the token values inside T013, never edit this rule body.
- [ ] T015 [US1] Switch DevTools `prefers-color-scheme` to `light` and reload. Open the configuration screen and run **axe DevTools** (Issues panel, Accessibility scan) and/or **Lighthouse → Accessibility**. Fix any reported `color-contrast` violations by tuning the role-token values inside the `@media` block from T013 (only — never inside rule bodies). Acceptance: cells 3 and 4 in [quickstart.md](quickstart.md) §4 mark ☑.
- [ ] T016 [US1] In the running browser (still in light theme), advance to the match screen by submitting the form. Walk audit cells 12–18 (six visual states + match-controls + match-over banner) per [quickstart.md](quickstart.md). Run axe DevTools / Lighthouse on each cell. Fix any violations by tuning role-token values inside the T013 `@media` block. Acceptance: cells 12–18 mark ☑. Particular attention to FR-003a: cell 12 must show the inactive card visibly distinct from the page (≥3:1 surface contrast).
- [ ] T017 [US1] In the same `@media (prefers-color-scheme: light)` block, if any element still leaks Bulma's flipped color (typical suspects: `.label`, `.input`, `.help.is-danger`, `.notification`), add the **minimum** explicit override per [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §4. Each addition must be justified by a specific axe finding from T015 or T016. Forbidden: hard-coded hex/HSL inside rule bodies — go through tokens, adding new role tokens to both the dark `:root` and the light `@media` block if a new role is identified.
- [ ] T018 [US1] Verify FR-007 (live theme switching): with the app open mid-game in dark mode, toggle DevTools `prefers-color-scheme` between `dark` and `light` without reloading. Confirm the page repaints in the new theme on every toggle and no element becomes unreadable at any point. Mark cells 19 and 20 in [quickstart.md](quickstart.md) ☑.

**Checkpoint**: User Story 1 is complete. The app is fully readable in the light theme and meets WCAG AA. The MVP fix ships now.

---

## Phase 4: User Story 2 — Brand identity preserved (Priority: P2)

**Goal**: The light theme reads as the same app as the dark theme. Same gold accents on links and `<kbd>`. Same purple-mid for active-normal cards, gold for in-reserve, crimson for exhausted. Only page background and body-text color invert.

**Independent Test**: Take screenshots of the match screen in dark mode and in light mode at the same `running` state. The pulsing card is purple-mid in both, the in-reserve card is gold in both, the exhausted card is crimson in both. Cell 21 in [quickstart.md](quickstart.md) marks ☑.

### Implementation for User Story 2

- [X] T019 [US2] In [../../assets/css/app.css](../../assets/css/app.css), audit the `@media (prefers-color-scheme: light)` block from T013–T017 and confirm that **none of the brand-accent tokens** (`--color-purple-deep`, `--color-purple-mid`, `--color-gold`, `--color-gold-deep`, `--color-active-normal-*`, `--color-active-warning-*`, `--color-active-danger-*`, `--color-paused-banner-*`, `--color-white`, `--color-black`) are redeclared inside it. If any leaked in during the previous tasks, remove them. Per [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md) §1 (theme-invariant) and forbidden-patterns §5.
- [ ] T020 [US2] With the app running in light theme on the match screen, force the active-normal state on player 1 and capture a screenshot. Repeat for active-in-reserve (force `is-active-in-reserve` class via DevTools), active-exhausted, and paused. Compare each side-by-side with the equivalent dark-theme screenshot from cells 6–9. Acceptance: the four card-state colors and the paused-banner pill are pixel-equivalent across themes (only the surrounding page background differs). Mark cell 21 in [quickstart.md](quickstart.md) ☑.

**Checkpoint**: User Story 2 is complete. Brand identity carries across both themes; SC-004 is satisfied.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, regression check, and edge-case verification — including the **dark-theme axe audit** that closes coverage on FR-002, FR-003, SC-001, SC-002 (analysis finding C1).

- [X] T021 [P] Re-run `node --test tests` from the repo root. Confirm the pass count is identical to the T001 baseline (SC-005). Any deviation is a regression and must be fixed before sign-off — investigate `assets/css/app.css` for accidentally introduced JavaScript-visible side effects (there should be none; if a test regressed, the cause is unrelated and the CSS-only diff should be re-reviewed).
- [ ] T022 [P] Walk audit cell 22 in [quickstart.md](quickstart.md): disable the DevTools `prefers-color-scheme` override entirely, reload, and confirm the app renders in the dark theme as the no-preference fallback (FR-001, FR-006). While here, also spot-check a focused `<input type="number">` in the configuration form and (if your browser autofills any saved values) a browser-autofill suggestion — both must remain readable inside the white form box (Edge Cases: native form controls / autofill). Mark ☑.
- [ ] T023 [P] (Best-effort, optional) Walk audit cell 23: enable Windows "High Contrast" / forced-colors mode and confirm no element renders white-on-white. This is out of scope per spec Edge Cases; record observations in [quickstart.md](quickstart.md) but do not block on cell 23.
- [ ] T024 [P] **Dark-theme axe audit** (analysis finding C1 — closes coverage on FR-002 / FR-003 / SC-001 / SC-002 for the dark theme). Switch DevTools `prefers-color-scheme` to `dark`, reload, and run axe DevTools / Lighthouse on every dark-theme cell in [quickstart.md](quickstart.md) §4: cells **1, 2** (configuration screen — initial render and validation-error visible) and cells **5, 6, 7, 8, 9, 10, 11** (match screen — `idle`/`ready`, active-normal, active-in-reserve, active-exhausted, `paused`, `match-over`, match-controls bar). Acceptance: every listed cell reports zero `color-contrast` violations and is marked ☑. Any violation is a regression introduced by Phase 2's token migration — fix by adjusting the token values in `:root` (dark default), never inside rule bodies.
- [X] T025 In [../../assets/css/app.css](../../assets/css/app.css), do a final pass with `grep -niE "(#fff(f{0,3})?\b|color\s*:\s*white\b|hsl\(\s*0\s*,\s*0%\s*,\s*100%|rgb\(\s*255\s*,\s*255\s*,\s*255)" assets/css/app.css` to confirm there are NO hard-coded white/near-white color values **inside rule bodies** (theme-tokens-contract §5 — forbidden patterns). Permitted exceptions: literal values inside the two declaration blocks (`:root` and `@media (prefers-color-scheme: light)`), and the existing `rgba(20,20,20,0.85)` paused-banner pill which is theme-invariant by design (Q4). Note: the broader regex (`#ffffff`, `rgb(255,255,255)`) addresses analysis finding A1 — the prior narrower grep would have missed those forms.
- [X] T026 Confirm zero diff in [../../index.html](../../index.html), `../../assets/js/*.js`, and `../../tests/**` versus the branch base via `git diff --stat main -- index.html assets/js tests`. The output MUST be empty (the feature is CSS-only per plan.md).
- [ ] T027 Final sign-off pass through [quickstart.md](quickstart.md) §5 "Definition of done": all cells **1–22** marked ☑ (cell 23 is best-effort), `node --test tests` pass count matches baseline, diff is contained to `assets/css/app.css` plus this feature's spec/plan documents.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** — no dependencies; can start immediately.
- **Foundational (Phase 2)** — depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)** — depends on Foundational only. Independently testable. Ships the MVP.
- **User Story 2 (Phase 4)** — depends on Foundational only. *Parallel-feasible* with US1 in principle, but in practice it audits the same `@media` block US1 writes, so it is most efficient to run US2 immediately after US1 (single pair of eyes).
- **Polish (Phase 5)** — depends on US1 (and ideally US2) being complete.

### Within Each Phase

- **Phase 2** is mostly sequential because every task edits the same file (`assets/css/app.css`). Tasks T004–T011 must be done in order; T012 is the verification step that gates Phase 3.
- **Phase 3 (US1)** is sequential within itself for the same reason.
- **Phase 4 (US2)** is sequential and short.
- **Phase 5** Polish tasks T021, T022, T023, T024 are independent verification surfaces and parallelizable [P].

### Parallel Opportunities

- T002 and T003 in Setup (different surfaces — server vs. screenshot capture).
- T021, T022, T023, T024 in Polish (different verification surfaces — `node --test`, no-preference render, forced-colors render, dark-theme axe audit).
- US1 and US2 *cannot* run in parallel by different developers safely because both edit the same `@media (prefers-color-scheme: light)` block in `assets/css/app.css` — merge conflicts guaranteed. Sequential is correct.

---

## Parallel Example: Polish Phase

```bash
# After US1 + US2 are complete, four independent verification surfaces:
# Terminal 1
node --test tests                                          # T021

# Browser tab A
# Disable DevTools prefers-color-scheme override → reload → audit cell 22 # T022

# Browser tab B
# Set DevTools prefers-color-scheme: dark → reload → axe on cells 1, 2, 5–11 # T024

# Windows Settings
# Enable High Contrast mode → reload app → audit cell 23 (best-effort)    # T023
```

---

## Implementation Strategy

### MVP (User Story 1 only)

Phases 1 → 2 → 3. After Phase 3 completes, the app meets the P1 success criterion: zero white-on-white, every text element WCAG AA in the **light** theme. Ship.

### Incremental delivery

1. **Increment 1 — MVP**: Phases 1 → 2 → 3. The bug is fixed; the app is usable for light-mode users.
2. **Increment 2 — Brand polish**: Phase 4. Verifies the brand-accent invariance (largely a no-op confirmation; the contract already enforces it). Required for sign-off but does not block shipping the MVP.
3. **Increment 3 — Final hardening**: Phase 5. Includes the dark-theme axe audit (T024), which is the formal evidence that the foundational refactor (Phase 2) did not regress the dark theme — required for SC-001/SC-002 sign-off across **both** themes.

In practice, since every phase edits the same file and the diff is small, all five phases will typically be completed in a single working session by one developer. The phase split exists to make the audit auditable, not to gate parallel work.

---

## Format Validation

All 27 tasks above conform to the strict checklist format:

- ✅ Every task starts with `- [ ]`.
- ✅ Every task has a sequential `T0NN` ID.
- ✅ User-story phase tasks (T013–T020) carry `[US1]` or `[US2]` labels.
- ✅ Setup, Foundational, and Polish tasks have no story label.
- ✅ Parallel-safe tasks are marked `[P]` (T002, T003, T021, T022, T023, T024).
- ✅ Every task names the exact file path or verification surface it touches.
- ✅ No "create new file" tasks (the feature is a single-file edit) — every task either edits `assets/css/app.css` or runs verification against existing assets.

## Task Counts

| Phase                 | Count | Notes |
|-----------------------|-------|-------|
| Setup (1)             | 3     | Baseline + local server + screenshots. |
| Foundational (2)      | 9     | Token refactor — sequential, single file. |
| US1 — Light variant (3) | 6   | New `@media` block + axe-driven tuning. **MVP scope.** |
| US2 — Brand identity (4) | 2  | Audit + screenshot diff. |
| Polish (5)            | 7     | Regression + edge cases + **dark-theme axe audit (T024)** + final sign-off. |
| **Total**             | **27** | |

## Suggested MVP Scope

**Phases 1 + 2 + 3** (T001 – T018) — 18 tasks. Delivers the full P1 user story (readable light theme). Phases 4 + 5 add brand-invariance verification and the dark-theme regression audit; both are required before merging but neither blocks shipping the MVP fix.

## Coverage closure for analysis findings

| Finding | Severity | Closed by |
|---------|----------|-----------|
| C1 — dark-theme audit not assigned | HIGH | New T024 (parallel-safe polish task) explicitly enumerates dark cells 1, 2, 5–11. |
| A2 — `.button.is-light` literal values inside rule body | MEDIUM | New `--color-button-light-bg / -fg / -border` tokens added to contract §2; T013 declares them; T014 references them only — zero literals inside the rule body. |
| T1 — broken markdown links to `assets/css/app.css` | LOW | All file links now use the workspace-relative `../../` form. |
| A1 — narrow grep in T024-old (now T025) | MEDIUM | T025's regex broadened to catch `#ffffff`, `rgb(255,255,255)`, and unspaced `hsl(0,0%,100%)`. |
| C2 — autofill / `<noscript>` not explicitly verified | LOW | Folded into T022 (spot-check focused number input + autofill suggestion in white form box). |
| I1 — "reserve label/clock" wording in spec US1 §2 | MEDIUM | Not addressed here (it's a spec-text edit, not a task); flagged for a separate small spec amendment if desired. |
| T2 — terminology drift "white-mode" vs "light theme" | LOW | Cosmetic; not addressed. |
