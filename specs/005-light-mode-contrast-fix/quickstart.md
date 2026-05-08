# Quickstart — Light-mode contrast fix

**Feature**: 005-light-mode-contrast-fix
**Phase**: 1 (Design)
**Date**: 2026-05-08

**Regression baseline (T001)**: `node --test tests` reports **77 pass / 0 fail / 0 skipped** as of branch creation. Post-implementation runs MUST match this exactly (SC-005).

## 1. Run locally

```powershell
# From repo root
python -m http.server 8000
# Open http://localhost:8000/ in a browser
```

## 2. Run the test suite (regression check)

```powershell
node --test tests
```

Expected: **all existing tests still pass** (no new automated tests
added — this feature is presentation-only).

## 3. Toggle the active theme during development

Browser DevTools let you simulate the OS preference without changing
your system settings:

- **Chrome / Edge**: DevTools → ⋮ menu → *More tools* → *Rendering* →
  scroll to **Emulate CSS media feature `prefers-color-scheme`** →
  pick `light` or `dark`.
- **Firefox**: DevTools → *Inspector* → top toolbar → click the
  sun/moon icon to toggle simulated `prefers-color-scheme`.
- **Safari**: Develop menu → *Experimental Features* → toggle the
  "Dark Mode" override, or use Web Inspector → ⋮ → *Default Appearance*.

## 4. Manual acceptance audit (SC-001, SC-002, FR-002, FR-003)

Verification method per spec Q5: **manual axe DevTools / Lighthouse
audit** on every screen × every color-scheme preference. Run **axe
DevTools** (Chrome/Edge/Firefox extension) and/or **Lighthouse**
(*Accessibility* category, mobile or desktop) on each cell below and
record the result.

The acceptance gate is: **every cell passes the axe `color-contrast`
rule with zero violations** (or, equivalently, Lighthouse Accessibility
shows no contrast issues for any element on the page).

### Audit cells

| #  | Screen        | `prefers-color-scheme` | State / step                                            | Pass? |
|----|---------------|------------------------|---------------------------------------------------------|-------|
| 1  | Configuration | dark                   | Initial render — title, subtitle, form labels, helper text, buttons, `<kbd>` hints, footer credit + link | ☐    |
| 2  | Configuration | dark                   | Validation error visible (submit with empty Player 1)   | ☐    |
| 3  | Configuration | light                  | Initial render (same elements as cell 1)                | ☐    |
| 4  | Configuration | light                  | Validation error visible                                | ☐    |
| 5  | Match         | dark                   | After "Crear partida" — `idle`/`ready`: both cards inactive (`is-inactive`), big digits, reserve label/clock visible (per-turn mode) | ☐    |
| 6  | Match         | dark                   | `running`, **active-normal**: one card pulsing purple with white digits | ☐    |
| 7  | Match         | dark                   | `running`, **active-in-reserve**: gold card with black digits | ☐    |
| 8  | Match         | dark                   | `running`, **active-exhausted**: crimson card with white digits | ☐    |
| 9  | Match         | dark                   | `paused`: greyed cards + dark "PAUSADO" pill            | ☐    |
| 10 | Match         | dark                   | `match-over` (per-match mode): `notification.is-danger` banner | ☐    |
| 11 | Match         | dark                   | Match-controls bar — Reiniciar / Empezar / Pausa / Sonido buttons | ☐    |
| 12 | Match         | light                  | `idle`/`ready`: inactive cards visibly distinct from the page (FR-003a) | ☐    |
| 13 | Match         | light                  | `running`, **active-normal**                             | ☐    |
| 14 | Match         | light                  | `running`, **active-in-reserve**                         | ☐    |
| 15 | Match         | light                  | `running`, **active-exhausted**                          | ☐    |
| 16 | Match         | light                  | `paused` (dark pill must dominate)                       | ☐    |
| 17 | Match         | light                  | `match-over`                                             | ☐    |
| 18 | Match         | light                  | Match-controls bar (all four buttons readable; ≥3:1 against the near-white page) | ☐    |

To force the `running` / state-specific cells without playing a real
game, you can temporarily lower `Tiempo por turno` and `Tiempo de
reserva` to 1 minute each, or use DevTools to add the appropriate
`is-active-*` class to a player card.

### Live theme-switching check (FR-007)

| #  | Step                                                                                              | Pass? |
|----|---------------------------------------------------------------------------------------------------|-------|
| 19 | Open the app in dark mode → start a match → mid-game, toggle DevTools `prefers-color-scheme` to `light` → page repaints in light theme without reload; no element becomes unreadable. | ☐    |
| 20 | Toggle back to `dark` → page returns to the canonical dark look. | ☐    |

### Brand-identity check (SC-004)

| #  | Step                                                                                              | Pass? |
|----|---------------------------------------------------------------------------------------------------|-------|
| 21 | Take a screenshot of the match screen in dark mode and one in light mode (same `running` state). The pulsing card is purple-mid, the in-reserve card is gold, the exhausted card is crimson, and links/`<kbd>` are gold in both screenshots; only the page background and body text differ. | ☐    |

### Forced-colors / no-`prefers-color-scheme` fallbacks (Edge cases)

| #  | Step                                                                                              | Pass? |
|----|---------------------------------------------------------------------------------------------------|-------|
| 22 | Disable the `prefers-color-scheme` override in DevTools and reload — the app renders in the dark theme (the no-preference fallback). No white-on-white. | ☐    |
| 23 | (Optional) Enable Windows "High Contrast" / forced-colors mode — text remains legible (system colors take over for some elements; nothing renders as white-on-white). | ☐    |

## 5. Definition of done

- All cells 1–22 marked ☑ (cell 23 is best-effort — forced-colors is
  out of scope per spec Edge Cases).
- `node --test tests` passes with the same number of tests as before
  the feature.
- The diff is contained to `assets/css/app.css` (plus this feature's
  spec/plan documents).
