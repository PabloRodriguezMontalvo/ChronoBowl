# Theme Tokens Contract — Light-mode contrast fix

**Feature**: 005-light-mode-contrast-fix
**Phase**: 1 (Design)
**Date**: 2026-05-08

This contract defines the semantic CSS custom properties that drive both
the dark and the light theme. Every rule in `assets/css/app.css` that
sets a `color`, `background`, `border-color`, `box-shadow` or
`outline-color` MUST resolve through one of these tokens. Hard-coded
hex/HSL values inside rule bodies are forbidden, except inside the two
declaration blocks listed at the end (`:root` and `@media
(prefers-color-scheme: light)`), which are the **only** places where
literal color values appear.

## 1. Brand-accent tokens (theme-invariant)

These tokens carry the **same value across both themes**. They form the
brand identity required by FR-001 and SC-004.

| Token                       | Value                       | Role |
|-----------------------------|-----------------------------|------|
| `--color-purple-deep`       | `hsl(251, 79%, 15%)`        | Dark-theme page background; brand "primary deep". |
| `--color-purple-mid`        | `hsl(252, 60%, 60%)`        | active-normal card surface; brand "primary mid". |
| `--color-purple-soft`       | `hsl(252, 45%, 78%)`        | Subtle highlights. |
| `--color-gold`              | `hsl(45, 85%, 60%)`         | active-in-reserve surface; dark-theme link/`<kbd>` accent. |
| `--color-gold-deep`         | `hsl(40, 75%, 45%)`         | Dark-theme `<kbd>` border; light-theme link color. |
| `--color-white`             | `#ffffff`                   | Active-normal/exhausted card text; form-box background. |
| `--color-black`             | `#1a1a1a`                   | Active-in-reserve card text; light-theme body text. |
| `--color-active-normal-bg`  | `var(--color-purple-mid)`   | Player-card normal state surface. |
| `--color-active-normal-fg`  | `var(--color-white)`        | Player-card normal state text. |
| `--color-active-warning-bg` | `var(--color-gold)`         | Player-card in-reserve state surface. |
| `--color-active-warning-fg` | `var(--color-black)`        | Player-card in-reserve state text. |
| `--color-active-danger-bg`  | `hsl(348, 86%, 50%)`        | Player-card exhausted state surface. |
| `--color-active-danger-fg`  | `var(--color-white)`        | Player-card exhausted state text. |
| `--color-paused-banner-bg`  | `rgba(20, 20, 20, 0.85)`    | Paused overlay pill (dominant in both themes — Q4). |
| `--color-paused-banner-fg`  | `var(--color-white)`        | Paused overlay pill text. |

## 2. Role tokens (theme-variant)

These tokens **change value between themes**. Each row gives the dark
default (declared in `:root`) and the light override (declared in
`@media (prefers-color-scheme: light)`).

| Token                          | Dark theme default              | Light theme value             | Consumed by |
|--------------------------------|---------------------------------|-------------------------------|-------------|
| `--color-page-bg`              | `var(--color-purple-deep)`      | `hsl(252, 30%, 96%)`          | `body` background |
| `--color-page-fg`              | `var(--color-white)`            | `#1a1a1a`                     | `body` color; `#config-screen .title`; `#config-screen .subtitle` (light theme); `#config-screen .content p` (light theme); footer credit |
| `--color-page-fg-muted`        | `hsla(0, 0%, 100%, 0.85)`       | `hsla(0, 0%, 0%, 0.65)`       | `#config-screen .subtitle`; `#config-screen .content`; `#config-screen .has-text-grey`; `.help` outside the form box |
| `--color-link`                 | `var(--color-gold)`             | `var(--color-gold-deep)`      | `#config-screen a` |
| `--color-link-hover`           | `hsl(45, 95%, 75%)`             | `hsl(40, 75%, 35%)`           | `#config-screen a:hover`, `#config-screen a:focus` |
| `--color-card-inactive-bg`     | `hsl(0, 0%, 96%)`               | `hsl(252, 15%, 88%)`          | `.player-card` default + `.player-card.is-inactive` |
| `--color-card-inactive-fg`     | `hsl(0, 0%, 30%)`               | `hsl(0, 0%, 20%)`             | Same elements (text). |
| `--color-form-box-bg`          | `var(--color-white)`            | `var(--color-white)`          | `#config-form.box` (white in both themes — deliberate. Bulma's default is fine here because the box has its own surface.) |
| `--color-form-box-border`      | `hsla(45, 85%, 60%, 0.25)`      | `hsla(45, 85%, 60%, 0.55)`    | `#config-form.box` border |
| `--color-form-box-shadow`      | `0 8px 32px rgba(0,0,0,0.35)`   | `0 4px 16px rgba(31,13,77,0.12)` | `#config-form.box` box-shadow |
| `--color-controls-bar-bg`      | `hsl(0, 0%, 100%)`              | `hsl(0, 0%, 100%)`            | `.match-controls` |
| `--color-controls-bar-border`  | `hsl(0, 0%, 90%)`               | `hsla(252, 30%, 40%, 0.18)`   | `.match-controls` top border |
| `--color-button-light-bg`      | (Bulma default — not redeclared in dark) | `hsl(252, 25%, 88%)`   | `.button.is-light` background in light theme (`#reset-btn`, `#mute-btn`); kept off the dark theme to leave Bulma's existing dark-theme rendering intact. |
| `--color-button-light-fg`      | (Bulma default — not redeclared in dark) | `hsl(0, 0%, 15%)`      | `.button.is-light` foreground in light theme. |
| `--color-button-light-border`  | (Bulma default — not redeclared in dark) | `hsla(252, 30%, 40%, 0.35)` | `.button.is-light` border in light theme. |

The fact that some role tokens take the same value in both themes
(`--color-form-box-bg`, `--color-controls-bar-bg`) is intentional: it
reserves a name we can re-tune later without touching rule bodies.

## 3. `color-scheme` declaration

`:root` declares:

```css
:root {
  color-scheme: dark light;   /* primary = dark; native chrome follows OS */
  /* …token declarations… */
}
```

This makes native form-control chrome (number-input spinners, the
default focus ring, scrollbars, autofill) follow the active theme,
preventing white-on-white fields in light mode and dark-on-dark fields
in dark mode without per-control styling.

## 4. Bulma override surface

Inside `@media (prefers-color-scheme: light)`, the following selectors
are explicitly overridden (in addition to the role-token redeclaration
above) to neutralize Bulma's own light-mode flips that would otherwise
defeat WCAG AA:

| Selector                                   | Property → Value (light theme) |
|--------------------------------------------|--------------------------------|
| `body`                                     | `background: var(--color-page-bg); color: var(--color-page-fg);` |
| `#config-screen .title`                    | `color: var(--color-page-fg);` |
| `#config-screen .subtitle`                 | `color: var(--color-page-fg-muted);` |
| `#config-screen .content`,<br/>`#config-screen .content p`,<br/>`#config-screen .content .has-text-grey`,<br/>`#config-screen .has-text-grey` | `color: var(--color-page-fg-muted) !important;` (matches existing `!important` in dark theme to defeat Bulma utilities) |
| `#config-screen a`                         | `color: var(--color-link);` |
| `#config-screen a:hover, …:focus`          | `color: var(--color-link-hover);` |
| `#config-screen kbd`                       | unchanged (gold pill — brand-invariant) |
| `.match-controls`                          | `background: var(--color-controls-bar-bg); border-top-color: var(--color-controls-bar-border);` |
| `.button.is-light`                         | `background-color: var(--color-button-light-bg); color: var(--color-button-light-fg); border-color: var(--color-button-light-border);` — the light-theme button is darkened to retain ≥3:1 against the near-white page. Specific values are pinned in §2; if the manual axe audit (R-007) shows a contrast failure, tune the **token values** in the `:root`/`@media` blocks, never inline literals. |

## 5. Forbidden patterns

- ❌ Hard-coded `color: white` / `color: #fff` outside the two
  declaration blocks.
- ❌ A new `<body data-theme="…">` attribute with JS-driven toggling
  (spec Assumptions: OS preference is the only switch).
- ❌ Importing additional Bulma sub-stylesheets or swapping the vendor
  build (no build step; constitution-implicit constraint).
- ❌ Use of the CSS `light-dark()` color function (R-005: insufficient
  browser support on the target floor).

## 6. Allowed deviations

- ✅ Adding more brand-accent tokens later (theme-invariant) without
  changing this contract.
- ✅ Tweaking concrete light-theme values during the manual audit pass
  (R-007) — this contract pins the **roles**, not the exact hex/HSL.

## 7. Acceptance binding

This contract is the source of truth for FR-001, FR-002, FR-003,
FR-003a, FR-004, FR-005, FR-006, FR-007. The manual axe DevTools /
Lighthouse audit recorded in [../quickstart.md](../quickstart.md) is the
acceptance gate.
