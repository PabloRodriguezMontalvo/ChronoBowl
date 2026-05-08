# Data Model — Light-mode contrast fix

**Feature**: 005-light-mode-contrast-fix
**Phase**: 1 (Design)
**Date**: 2026-05-08

This feature has **no runtime data model**, **no persisted state**, and
**no DOM structure changes**. It is purely a presentation update.

The "data" of this feature is the **token table** — the semantic CSS
custom properties that describe each visual role and the value each
role takes in each theme. The authoritative table lives in the contract
document: [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md).

## What does NOT change

| Layer                                      | Status     |
|--------------------------------------------|------------|
| `bbtimer.config.v1` (localStorage)         | Unchanged. |
| `bbtimer.audio.v1` (localStorage)          | Unchanged. |
| Runtime `Match` object (state.js)          | Unchanged. |
| Pure helpers (`recompute`, `endTurn`, `pause`, `reset`, `validateConfig`, `derivePlayerVisualStateDelta`) | Unchanged. |
| HTML structure of `index.html`             | Unchanged. |
| Visual-state contract (six states from `specs/001-bloodbowl-timer/contracts/ui-contract.md`) | Unchanged semantics; only inactive-card values shift in the light theme. |
| Audio cue contract                         | Unchanged. |

## What DOES change

| Layer                                      | Change |
|--------------------------------------------|--------|
| `assets/css/app.css` `:root` block         | Adds new role tokens (page-bg, page-fg, page-fg-muted, link, link-hover, card-inactive-bg, card-inactive-fg, form-box-bg, form-box-border, form-box-shadow, controls-bar-bg, controls-bar-border). Keeps existing brand tokens unchanged. |
| `assets/css/app.css` new `@media (prefers-color-scheme: light)` block | Re-declares the role tokens above with light-theme values. Brand tokens (purple, gold, crimson) are NOT redeclared — they carry across. |
| `assets/css/app.css` rule body migrations  | Replaces hard-coded `var(--color-white)`, `hsl(0,0%,96%)`, `hsl(0,0%,30%)` etc. with the new role tokens (≈ 6 rules touched). |
| `assets/css/app.css` `:root`               | Adds `color-scheme: dark light;` so native form-control chrome follows the active theme. |

## Mapping — six visual states across both themes

| State                  | Background (both themes)        | Foreground (dark theme) | Foreground (light theme) | Notes |
|------------------------|---------------------------------|-------------------------|--------------------------|-------|
| **inactive**           | `--color-card-inactive-bg`<br/>(dark: `hsl(0,0%,96%)`<br/>light: `hsl(252,15%,88%)`) | `--color-card-inactive-fg`<br/>`hsl(0,0%,30%)` | `--color-card-inactive-fg`<br/>`hsl(0,0%,20%)` | The only state whose background varies between themes. ≥3:1 vs page in both (FR-003a). |
| **active-normal**      | `--color-active-normal-bg`<br/>`var(--color-purple-mid)` | `--color-active-normal-fg`<br/>`var(--color-white)` | same | Brand purple stays constant; white digits give >7:1. |
| **active-in-reserve**  | `--color-active-warning-bg`<br/>`var(--color-gold)` | `--color-active-warning-fg`<br/>`var(--color-black)` | same | Gold stays constant; black digits give >10:1. |
| **active-exhausted**   | `--color-active-danger-bg`<br/>`hsl(348,86%,50%)` | `--color-active-danger-fg`<br/>`var(--color-white)` | same | Crimson stays constant. |
| **paused** (overlay)   | `--color-paused-banner-bg`<br/>`rgba(20,20,20,0.85)` | `--color-paused-banner-fg`<br/>`var(--color-white)` | same | Decision Q4: dominant overlay identical in both themes. |
| **paused** (cards)     | desaturated via `filter: grayscale(80%)` | `#1a1a1a` (forced) | `#1a1a1a` (forced) | Existing rule already forces dark text on greyed cards; works in both themes. |
| **idle**               | n/a (config screen showing)     | n/a                     | n/a                      | Theme governs the configuration-screen text via page-fg / page-fg-muted. |

## Token vocabulary

See [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md)
for the full catalog of token names, their roles, the value each takes
in each theme, and the elements that consume each token.
