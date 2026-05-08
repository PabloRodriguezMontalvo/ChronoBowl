# Implementation Plan: Light-mode contrast fix (dual-theme)

**Branch**: `005-light-mode-contrast-fix` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-light-mode-contrast-fix/spec.md`

## Summary

Replace the current single-theme stylesheet (deep-purple page + white text,
plus accidental Bulma `prefers-color-scheme: light` leakage that breaks
contrast) with a deliberate **dual-theme** design driven exclusively by the
user-agent's `prefers-color-scheme` media query.

- **Dark theme** (default + `prefers-color-scheme: dark` + no preference):
  preserves the current look bit-for-bit (deep-purple page, white body
  text, white digits on the active-normal card).
- **Light theme** (`prefers-color-scheme: light`): a **very light tinted
  purple** page background (`hsl(252, 30%, 96%)`) with dark body text
  (`#1a1a1a`); the same brand accent colors carry across — purple-mid for
  active-normal, gold for in-reserve, crimson for exhausted, gold for
  links/`<kbd>`. The **inactive** player card uses a darker light-slate
  surface (`hsl(252, 15%, 88%)`) so it reads as a card on the page rather
  than blending into the near-white background. The **paused-banner** pill
  stays dark in both themes by design (it is an attention-grabbing
  overlay).

The fix is **CSS-only**. No HTML restructuring, no JavaScript, no new
runtime dependency, no persisted-storage change, no test-runner change.
The implementation strategy is to introduce a **two-tier token layer** in
`assets/css/app.css`: a single `:root` declaration that defines the dark
(default) values, and a single `@media (prefers-color-scheme: light)`
block that overrides the *same* tokens with light-theme values. Every
existing rule already references those tokens, so the cascade does the
rest. A handful of rules that previously hard-coded `var(--color-white)`
or near-white surface colors are migrated to new semantic tokens (e.g.
`--color-page-bg`, `--color-page-fg`, `--color-card-inactive-bg`,
`--color-card-inactive-fg`).

A `color-scheme: dark light` declaration is added so native form-control
chrome (number-input spinners, focus rings, scrollbars) follows the
active theme rather than the user-agent default.

## Technical Context

**Language/Version**: CSS3 (custom properties + media queries). No JavaScript change.
**Primary Dependencies**: Bulma 1.0.2 + Animate.css 4.1.1 (vendored). **No new libraries.** Bulma's built-in `prefers-color-scheme: light` block is the load-bearing leak source — the fix layers explicit overrides on top of it for every element whose foreground would otherwise be set by Bulma's flipped tokens.
**Storage**: Unchanged. `bbtimer.config.v1` and `bbtimer.audio.v1` untouched.
**Testing**: `node --test tests` (existing logic tests must still pass; 0 new automated tests). Acceptance verification is a **manual axe DevTools / Lighthouse audit** captured in `quickstart.md` (per spec Q5).
**Target Platform**: Modern browsers on desktop and mobile (GitHub Pages hosting). The dual theme requires `prefers-color-scheme` support (Chrome 76+, Edge 79+, Safari 12.1+, Firefox 67+ — all current).
**Project Type**: Single-page static web app.
**Performance Goals**: 60 fps render loop preserved (no JS work added; only token resolution which the engine already does once per element on style recalculation).
**Constraints**: Zero regressions on existing automated tests; zero changes to runtime state or DOM structure; live theme switching when the OS toggles `prefers-color-scheme` (FR-007), which falls out for free from CSS media queries.
**Scale/Scope**: ~80 LOC delta in `assets/css/app.css` (token table refactor + new `@media` block + a few rule migrations). 0 LOC delta in `index.html` and any `.js`. One acceptance-audit checklist added to `quickstart.md`.

## Constitution Check

The repository constitution (`.specify/memory/constitution.md`) is the
template scaffold; no concrete principles are ratified. **Pass.**

Inherited project conventions from features 001–004 are honored:

1. **Pure helpers stay pure** — none are modified. This feature touches
   only the stylesheet.
2. **Tests-first when adding behavior** — no new behavior is added; the
   feature is presentation-only. Existing tests serve as the regression
   harness.
3. **Adapters at the boundary** — no new adapter is introduced; the only
   "boundary" here is the CSS cascade against Bulma's vendored
   stylesheet, which is handled by token-level overrides.
4. **WCAG AA** — explicitly upheld in both themes (SC-001, SC-002),
   matching the existing comment policy in `assets/css/app.css`.

## Project Structure

### Documentation (this feature)

```text
specs/005-light-mode-contrast-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (token table — no runtime data)
├── quickstart.md        # Phase 1 output (manual axe/Lighthouse audit checklist)
├── contracts/
│   └── theme-tokens-contract.md   # Semantic CSS-token names + per-theme values
├── checklists/
│   └── requirements.md  # Already created in /speckit.specify
└── tasks.md             # Phase 2 (created later by /speckit.tasks)
```

### Source Code (repository root)

```text
/
├── index.html                      # Untouched
├── assets/
│   ├── css/app.css                 # Edit: token refactor + light-theme @media block
│   └── js/                         # Untouched (state.js / render.js / main.js / input.js / audio.js / storage.js)
└── tests/                          # Untouched (no new automated tests; manual audit instead)
```

**Structure Decision**: Single-file CSS edit in the existing flat layout.
Every change lands inside `assets/css/app.css`. The semantic token names
declared at `:root` and re-declared in `@media (prefers-color-scheme:
light)` form the contract surface (see
[contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md)).

## Complexity Tracking

No constitution violations to justify. Notable scope choices:

- **Why not a `<body data-theme="...">` attribute toggle (no media
  query)?** Rejected because the spec mandates OS-driven selection only
  (no user-controlled switcher; spec Assumptions). A class/attribute
  toggle would require JavaScript with no user-visible benefit.
- **Why a token re-declaration block instead of `light-dark()`?** The
  CSS `light-dark()` color function (CSS Color Module Level 5) is not
  yet supported in all evergreen browsers we target on May 2026 (e.g.
  older mobile Safari versions still in the wild). A `@media`-based
  token override is universally supported and behaves identically.
- **Why keep the paused-banner pill identical across themes?** Spec Q4
  decision: the banner is an attention-grabbing overlay; visual weight
  is intentional. Keeping one rule reduces test surface.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                   |
