# Feature Specification: Light-Mode Contrast Fix

**Feature Branch**: `005-light-mode-contrast-fix`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "We need to fix the ux/ui in 'white-mode' not dark mode. The background is white in that mode and also the text have no contrast"

## Clarifications

### Session 2026-05-08

- Q: Implementation strategy — single brand look across all OS color schemes, or a real light variant? → A: Two looks. Keep the current dark/purple appearance under `prefers-color-scheme: dark` (and as the no-preference fallback), and ship a deliberately-designed light variant under `prefers-color-scheme: light` — light page background, dark body text, brand purple/gold accents preserved.
- Q: Light-theme page background — what color? → A: A very light tinted purple (around `hsl(252, 30%, 96%)`), light enough for WCAG AA with dark body text while keeping the app on-brand and visually distinguishable from a default Bulma white page.
- Q: Inactive player-card surface in light theme (would otherwise blend into the near-white page)? → A: Darken the inactive card surface to a light-slate purple tint (around `hsl(252, 15%, 88%)`) and keep the existing dark text. The card visibly recedes but stays clearly distinct from the page background; active-normal / in-reserve / exhausted cards keep their existing bold accent backgrounds in both themes.
- Q: Paused-banner pill appearance in light theme? → A: Keep the existing dark translucent pill (white text on `rgba(20,20,20,0.85)`) identical in both themes. The paused banner is an attention-grabbing overlay; its dominant visual weight is intentional and the contrast already comfortably exceeds WCAG AA on any background.
- Q: Verification method for the WCAG AA acceptance criteria? → A: Manual audit using browser DevTools accessibility tooling (axe DevTools and/or Lighthouse) on each screen × each `prefers-color-scheme` preference (dark + light), with the resulting pass/fail checklist captured in this feature's `quickstart.md`. No new automated tooling or dependency is added; existing `node --test` logic tests remain untouched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Polished light variant when the browser/OS is in light color scheme (Priority: P1)

A coach opens the Blood Bowl Timer on a device whose operating system or browser is configured to use a light color scheme (e.g. Windows "Light mode", macOS "Light appearance", Chrome/Edge "Light theme", or `prefers-color-scheme: light`). They expect a deliberately-designed light appearance — light page background, dark body text, brand purple/gold accents preserved — and to read every piece of text on both the configuration screen and the match screen without squinting.

**Why this priority**: This is a blocking accessibility/UX defect. Today, in light mode, large portions of the UI render as white (or near-white) text on white backgrounds, making the app effectively unusable for any user whose system is not in dark mode. Fixing it restores baseline usability for ~50% of the audience.

**Independent Test**: Can be fully validated by switching the OS/browser to light color scheme, loading the app, and verifying every text element on the configuration screen and the match screen meets WCAG AA contrast against its actual rendered background — no further features required.

**Acceptance Scenarios**:

1. **Given** the user's browser reports `prefers-color-scheme: light`, **When** they open the configuration screen, **Then** the page title, subtitle, form labels, input text, helper text, button labels, keyboard-shortcut hints, footer credit and link all render with at least WCAG AA contrast (≥4.5:1 for normal text, ≥3:1 for large text) against their actual rendered background.
2. **Given** the user's browser reports `prefers-color-scheme: light`, **When** they start a match, **Then** every player card state (inactive, active-normal, active-in-reserve, active-exhausted, paused) shows the player name, turn clock, reserve label and reserve clock with at least WCAG AA contrast.
3. **Given** the user's browser reports `prefers-color-scheme: light`, **When** the match controls bar is visible, **Then** every button label (Reiniciar, Empezar, Pausa, Sonido) and the "PAUSADO" / "¡Tiempo agotado!" banners are clearly legible.
4. **Given** the user toggles their OS color scheme from dark to light while the app is open, **When** the app re-renders, **Then** no element becomes unreadable; the visual identity (purple/gold palette) is preserved.

---

### User Story 2 - Brand identity preserved across both themes (Priority: P2)

The app's brand palette (deep purple, gold accents) is part of its identity. The new light variant must clearly read as "the same app" — not a generic Bulma page — so the purple/gold accents remain the visual signature in both themes, even though the page background and body text invert.

**Why this priority**: Brand consistency. A correct fix must keep the app recognizable across themes and must not regress the existing dark-mode experience that already meets WCAG.

**Independent Test**: Open the app side-by-side with `prefers-color-scheme: dark` and `prefers-color-scheme: light`. Both renderings show the same gold accents (links, `<kbd>`, focus rings) and the same semantic player-card state colors (purple = active-normal, gold = in-reserve, crimson = exhausted), differing only in page background and body-text color.

**Acceptance Scenarios**:

1. **Given** the app is opened with `prefers-color-scheme: light`, **When** the configuration screen renders, **Then** accent elements (links, `<kbd>`, focus rings, primary button) use the brand gold/purple colors and are the dominant visual signature on the page.
2. **Given** the app is opened with `prefers-color-scheme: light`, **When** a player card is in the active-normal state, **Then** the card background is the brand purple-mid color with high-contrast digits, semantically identical to dark mode.

---

### Edge Cases

- The user's browser does not support `prefers-color-scheme` (very old browsers): the app must still render with the dark/brand appearance — no element may become unreadable.
- The user enables Windows "High Contrast" / forced-colors mode: text must remain legible (acceptable to defer to system colors, but no white-on-white rendering).
- The user prints the page or saves it as PDF (which often forces a light background): the printed output is out of scope for this fix, but on-screen behaviour must not regress.
- A native form control (e.g. `<input type="number">` spinner, focus ring) inherits the user-agent's light styling: the input contents must remain readable inside the white form box.
- The user-agent applies its own light-mode default colors to elements that have no explicit color set in the app's stylesheet (e.g. `<noscript>` fallback, browser autofill suggestions): contrast against the actual rendered background must still meet WCAG AA.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST render two distinct themes driven by the user-agent's `prefers-color-scheme` media query: a **dark theme** (current deep-purple page, white body text — also used as the no-preference fallback) and a **light theme** (very light tinted-purple page background, dark body text). Both themes MUST share the same brand accent colors (purple-mid for active-normal cards, gold for in-reserve and accents, crimson for exhausted) so the app stays visually recognizable across themes.
- **FR-002**: Every text element on the configuration screen — title, subtitle, form labels, input text, placeholder text, helper text, error text, primary/secondary button labels, keyboard-shortcut hints, footer credit and footer link — MUST meet WCAG AA contrast against its actual rendered background under `prefers-color-scheme: light`, under `prefers-color-scheme: dark`, and when no preference is reported.
- **FR-003**: Every text element on the match screen — player names, turn clock digits, reserve label, reserve clock digits, paused banner, match-over banner, and every match-control button label — MUST meet WCAG AA contrast against its actual rendered background in all six visual states (inactive, active-normal, active-in-reserve, active-exhausted, paused, idle) under both color-scheme preferences.
- **FR-003a**: In the light theme, the **inactive** player-card surface MUST be visibly distinct from the page background (target: ≥3:1 contrast between inactive-card surface and page background) so users can still locate the inactive side; this is achieved by using a darker neutral surface (light-slate purple tint) for the inactive card while keeping its dark foreground text. Other player-card states (active-normal, active-in-reserve, active-exhausted, paused) retain their existing bold accent backgrounds in both themes.
- **FR-004**: The application MUST NOT rely on the user-agent's default text color for any element that sits on a non-default background; every text element on a custom-colored background MUST set its own foreground color explicitly.
- **FR-005**: The application MUST NOT rely on the user-agent's default background color for the page; the page background MUST be set explicitly by the active theme.
- **FR-006**: The fix MUST NOT regress the existing appearance or contrast of the app when the browser reports `prefers-color-scheme: dark` or has no preference set; the dark theme remains the canonical/default look.
- **FR-007**: When the user changes their OS color-scheme preference while the app is loaded, the app MUST switch themes live without a reload (no element becomes unreadable due to stale cascaded colors, and no JavaScript intervention is required).

### Key Entities

*(Not applicable — this feature changes presentation only; no data model is introduced or modified.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of text elements on the configuration screen and the match screen meet WCAG AA contrast (≥4.5:1 normal, ≥3:1 large/bold) when audited under both `prefers-color-scheme: light` and `prefers-color-scheme: dark`, verified via a manual axe DevTools / Lighthouse audit recorded in `quickstart.md`.
- **SC-002**: 0 elements render with foreground/background contrast below 3:1 in either color-scheme preference, as reported by the same axe DevTools / Lighthouse audit on both screens.
- **SC-003**: A user opening the app on a device set to light mode can identify and tap the "Crear partida" button, read all player names and digits during a match, and recognize the paused state — measured by 100% task success in informal usability checks with at least 3 testers using light-mode devices.
- **SC-004**: The app's brand identity remains recognizable across themes: a screenshot taken in light mode and one in dark mode share the same accent colors (gold links/`<kbd>`, purple-mid active-normal cards, crimson exhausted state) and only differ in page background and body-text color.
- **SC-005**: Existing automated tests continue to pass (no logic regressions introduced by the styling fix).

## Assumptions

- The fix is scoped to CSS / presentation only; no JavaScript state, no new user-facing toggle, no persistence change. Theme selection is driven exclusively by `prefers-color-scheme`.
- The app ships **two themes** sharing one brand-accent palette: a dark theme (current look, also no-preference fallback) and a new light theme. Page background and body text invert; accent colors (purple/gold/crimson) stay constant so the app remains recognizable across themes.
- WCAG AA (4.5:1 normal text, 3:1 large/bold text) is the contrast target in **both** themes, consistent with comments already present in `assets/css/app.css`.
- Bulma 1.x's built-in `prefers-color-scheme` handling is the most likely root cause of today's bug (it redefines its CSS custom properties under a `@media (prefers-color-scheme: light)` block, which leaks into elements the app has not explicitly styled). The chosen fix may neutralize Bulma's mode switch and then re-introduce a deliberate light-theme override layer, or override its tokens — the exact approach is a planning concern.
- The 6 visual states defined in `specs/001-bloodbowl-timer/contracts/ui-contract.md` §2 remain the source of truth for player-card semantics; their **accent colors** carry across themes, while their text foreground may differ between themes to keep WCAG AA.
- Out of scope: print stylesheet, forced-colors / high-contrast OS mode tuning beyond "no white-on-white", introducing a user-controlled theme switcher (the OS preference is the only switch), redesigning the brand palette.
