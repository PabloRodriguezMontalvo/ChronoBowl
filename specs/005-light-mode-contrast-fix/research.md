# Research — Light-mode contrast fix

**Feature**: 005-light-mode-contrast-fix
**Phase**: 0 (Outline & Research)
**Date**: 2026-05-08

The clarification session resolved the five load-bearing decisions
(strategy, light-theme page bg, inactive-card surface, paused-banner
behaviour, verification method). The remaining research validates the
chosen technical approach and documents rejected alternatives.

---

## R-001 — Root cause of today's white-on-white leak

**Decision**: The leak originates from **Bulma 1.x's built-in
`@media (prefers-color-scheme: light)` block**, which redeclares
Bulma's CSS custom properties (`--bulma-text`, `--bulma-background`,
`--bulma-scheme-main`, etc.) for the light scheme. Several elements in
`index.html` rely on Bulma's default text color (e.g. `.title`,
`.subtitle`, `.help`, `.button.is-light`, `.notification`) and
therefore inherit Bulma's flipped foreground when the OS is in light
mode. The current `assets/css/app.css` only overrides Bulma's tokens
under the assumption of a deep-purple page; it does not provide an
alternative coherent set of values for light mode.

**Rationale**: confirmed by reading
`assets/vendor/bulma.min.css` (matches `prefers-color-scheme:light`
inside the file) and by the existing comment in `app.css` line 56:
*"Bulma's default heading colours assume a light page; on the
deep-purple background they fail WCAG. Force white / translucent-white
for accessibility."* — the override is intentional but only solves
the dark direction.

**Alternatives considered**:

- *Patch the Bulma vendor file*: rejected. Updating Bulma in the future
  would silently overwrite the patch.
- *Drop Bulma's vendored light block via a CSS preprocessor build
  step*: rejected. The project is intentionally build-step-free
  (`README.md` and `index.html` confirm static-file delivery).

---

## R-002 — Token-level override vs. element-level override

**Decision**: **Token-level**. Define semantic theme tokens once at
`:root` (dark values, the default) and once in `@media
(prefers-color-scheme: light)` (light values), and migrate the small
number of rules that hard-code `var(--color-white)` or specific
hex/HSL values to use the new semantic tokens. Almost every existing
rule already references a CSS custom property; only ~6 rules need
migration.

**Rationale**:

- Single source of truth per token; future tweaks land in one place.
- The cascade resolves automatically when the OS preference changes —
  no JavaScript, satisfies FR-007 for free.
- Keeps the diff localized and easy to review.

**Alternatives considered**:

- *Per-element override block*: rejected. Doubles the number of rules
  to maintain and risks drift between similar elements.
- *Use the `light-dark()` CSS color function*: rejected on browser
  support grounds (R-005).

---

## R-003 — New semantic tokens to introduce

**Decision**: Introduce these new tokens (alongside the existing brand
tokens which stay constant across themes):

| Token                          | Dark default                  | Light value                    | Used by |
|--------------------------------|-------------------------------|--------------------------------|---------|
| `--color-page-bg`              | `var(--color-purple-deep)`    | `hsl(252, 30%, 96%)`           | `body` background |
| `--color-page-fg`              | `var(--color-white)`          | `#1a1a1a`                      | `body` color, headings, paragraph text on page |
| `--color-page-fg-muted`        | `hsla(0,0%,100%,0.78)`        | `hsla(0,0%,0%,0.65)`           | `.help`, `.has-text-grey`, footer credit |
| `--color-link`                 | `var(--color-gold)`           | `var(--color-gold-deep)`       | `#config-screen a` (gold-deep on light meets AA) |
| `--color-link-hover`           | `hsl(45,95%,75%)`             | `hsl(40,75%,35%)`              | link hover/focus |
| `--color-card-inactive-bg`     | `hsl(0,0%,96%)`               | `hsl(252,15%,88%)`             | `.player-card.is-inactive` and the default `.player-card` |
| `--color-card-inactive-fg`     | `hsl(0,0%,30%)`               | `hsl(0,0%,20%)`                | inactive-card text |
| `--color-form-box-bg`          | `var(--color-white)`          | `var(--color-white)`           | `#config-form.box` (stays white in both themes) |
| `--color-form-box-border`      | `hsla(45,85%,60%,0.25)`       | `hsla(45,85%,60%,0.55)`        | gold edge — needs more opacity to read on a light page |
| `--color-form-box-shadow`      | `0 8px 32px rgba(0,0,0,0.35)` | `0 4px 16px rgba(31,13,77,0.12)` | form-box shadow |
| `--color-controls-bar-bg`      | `hsl(0,0%,100%)`              | `hsl(0,0%,100%)`               | `.match-controls` (white in both — needs separation token below in dark too) |
| `--color-controls-bar-border`  | `hsl(0,0%,90%)`               | `hsla(252,30%,40%,0.18)`       | top border of match-controls |

The pre-existing brand tokens (`--color-purple-deep`, `--color-purple-mid`,
`--color-gold`, `--color-gold-deep`, `--color-active-normal-*`,
`--color-active-warning-*`, `--color-active-danger-*`,
`--color-paused-banner-*`) **stay constant in both themes**, satisfying
FR-001 and SC-004 (brand identity recognizable across themes).

**Rationale**: the token names describe **role** (page foreground, card
inactive surface, link), not **value**, so the same rule body works in
both themes.

**Alternatives considered**:

- *Override the existing `--color-inactive-bg` / `--color-inactive-fg`
  tokens directly without renaming*: accepted as a refinement — the
  contract document keeps the existing names and only adds new ones
  where a role didn't exist before. Final list in
  [contracts/theme-tokens-contract.md](contracts/theme-tokens-contract.md).

---

## R-004 — Bulma override surface

**Decision**: Layer **explicit overrides for Bulma's flipped tokens**
inside the same `@media (prefers-color-scheme: light)` block. The
existing `app.css` already overrides Bulma colors for the dark theme
under `#config-screen` selectors; we extend the same pattern.

The minimal Bulma surface to lock down per theme:

- `.title`, `.subtitle` → `color: var(--color-page-fg)` (light) /
  unchanged white (dark).
- `.label` (inside `#config-form.box`) → unchanged (the form box is
  white in both themes, so dark text is correct).
- `.help`, `.has-text-grey` (outside the form box) →
  `color: var(--color-page-fg-muted)`.
- `.button.is-light` → in the **light** theme, give it a darker fill
  so it doesn't blend into the near-white page (the affected buttons
  are `#reset-btn` and `#mute-btn`).
- `.notification.is-danger` → unchanged; its own `--bulma-*` tokens
  already give AA in both themes.

**Rationale**: Bulma's own tokens are scheme-aware; we only need to
re-anchor the elements whose Bulma-resolved color does not match our
chosen role token.

**Alternatives considered**:

- *Set `[data-theme="dark"]` on `<html>` to force Bulma's dark
  variables*: rejected. Bulma 1.x's data-theme support is unofficial;
  relying on it couples us to its internals.
- *Wholesale neutralize Bulma's `prefers-color-scheme: light` rules
  with `all: unset` or similar*: rejected. Heavy-handed and risks
  breaking layout.

---

## R-005 — Browser support for `light-dark()` and `color-scheme`

**Decision**:

- **Use `color-scheme: dark light`** on `:root`. Supported in every
  browser we target (Chrome 81+, Safari 13+, Firefox 96+); falls back
  silently on older engines.
- **Do NOT use the `light-dark()` color function**. It is in CSS Color
  Module Level 5 and shipped in Chromium 123 / Firefox 120 / Safari
  17.5 — newer than our floor. Older mobile Safari versions still in
  the wild on May 2026 may not have it. The `@media`-based override
  pattern (R-002) achieves the same outcome with broader support.

**Rationale**: documented browser-support data on caniuse.com matches
the floor we already serve via Bulma 1.x.

**Alternatives considered**:

- *`light-dark()` everywhere, polyfilled for older Safari*: rejected.
  No standard polyfill exists; the build-step-free constraint forbids
  introducing one.

---

## R-006 — Live theme switching when the OS toggles preference

**Decision**: No code change required. The CSS engine re-resolves
`@media (prefers-color-scheme)` rules automatically when the OS or
browser changes the preference; tokens flip live, the cascade
recomputes, and the page repaints without a reload. This satisfies
FR-007 by construction.

**Rationale**: this is standard CSS behaviour; verified manually in
Chrome 124+ and Firefox 125+ during research.

**Alternatives considered**:

- *Listen to `window.matchMedia('(prefers-color-scheme: light)')`
  events from JS and add/remove a class*: rejected. Adds JavaScript
  for zero user-visible benefit.

---

## R-007 — Verification tooling

**Decision**: **Manual axe DevTools / Lighthouse audit** on:

- two screens: configuration screen + match screen (the latter walked
  through all six visual states: inactive, active-normal,
  active-in-reserve, active-exhausted, paused, idle / match-over),
- two `prefers-color-scheme` settings: dark + light,

= **12 audit cells**, recorded as a checklist in `quickstart.md`.
The acceptance test is "every cell passes axe's color-contrast rule".
Spec Q5.

**Rationale**: zero new tooling, zero new dependency, reproducible in
any modern browser DevTools.

**Alternatives considered**:

- *Playwright + axe-core automated test*: rejected per spec Q5.
- *Hand-computed contrast table in the spec*: rejected as sole
  evidence — six states × accent backgrounds change makes hand
  computation error-prone; the audit catches more cases (e.g. focus
  rings, autofill, link states).
