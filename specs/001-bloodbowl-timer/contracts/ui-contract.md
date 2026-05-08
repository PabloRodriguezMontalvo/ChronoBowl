# UI Contract: Inputs, Visual States & Persistence

**Feature**: 001-bloodbowl-timer  
**Date**: 2026-05-08

This is the only "external" contract surface of the project: the user-facing input bindings, the visual states that must be distinguishable, and the on-disk shape of the persisted configuration. There is no HTTP API.

---

## 1. Input bindings

### Keyboard (laptop)

| Key       | Action                                                                  | Notes                                              |
|-----------|-------------------------------------------------------------------------|----------------------------------------------------|
| `A`       | End turn — accepted only when Player 1 is the active player.            | `keydown`, ignore if `event.repeat === true`.      |
| `L`       | End turn — accepted only when Player 2 is the active player.            | Same handling as `A`.                              |
| `Space`   | Toggle pause/resume.                                                    | `keydown`, `event.preventDefault()` to stop scroll.|
| (none)    | Reset is **not** keyboard-bound; the user must use the on-screen button.| Prevents accidental destructive action.            |

Debounce: any accepted end-turn event sets a 150 ms cooldown during which further end-turn events are ignored, regardless of source (keyboard or touch).

### Touch / pointer (phone)

| Target                                         | Action            |
|------------------------------------------------|-------------------|
| Player 1 clock card (left/top half)            | End Player 1 turn (only when Player 1 is active). |
| Player 2 clock card (right/bottom half)        | End Player 2 turn (only when Player 2 is active). |
| On-screen "⏸ Pause" / "▶ Resume" button       | Toggle pause/resume. |
| On-screen "Reset" button                       | Open confirm dialog → reset on confirm. |

All on-screen interactive elements are tap targets of at least 44×44 CSS pixels (SC-007).

---

## 2. Visual states (every state MUST be visually distinct at a glance)

| State name          | When it applies                                                                | Required visual treatment                                                                 |
|---------------------|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `inactive`          | Player is not the active player and match is running.                          | Muted background (Bulma neutral), reduced size or opacity, no animation.                  |
| `active-normal`     | Player is active, turn timer > 0.                                              | Bold accent background (e.g., Bulma `is-primary`), enlarged card, subtle pulsing animation.|
| `active-in-reserve` | Player is active, turn timer at 0, reserve > 0.                                | Warning accent (e.g., Bulma `is-warning`), distinctly different hue from `active-normal`, faster pulse. |
| `active-exhausted`  | Player is active, turn timer = 0 and reserve = 0.                              | Danger accent (e.g., Bulma `is-danger`), shake animation, clock displays `0:00`.          |
| `paused`            | Match phase is `paused`.                                                       | Both cards visibly desaturated; a global "PAUSED" overlay or banner appears.              |
| `idle` (config)     | Match phase is `idle`.                                                         | Configuration form visible; clock area hidden or reduced.                                 |

`prefers-reduced-motion` disables the pulse and shake animations but preserves color and size differentiation.

`aria-live="polite"` is set on each player's clock display container so transitions between these states are announced.

---

## 3. Configuration persistence schema (`localStorage`)

**Key**: `bbtimer.config.v1`

**Value** (JSON):

```json
{
  "schemaVersion": 1,
  "player1Name": "string (0–24 chars after trim)",
  "player2Name": "string (0–24 chars after trim)",
  "turnSeconds": 240,
  "reserveSeconds": 0
}
```

**Read behaviour**: on app load, if the value is absent, not parseable as JSON, missing required fields, or has `schemaVersion !== 1`, the app silently falls back to defaults and overwrites with a fresh write on next save.

**Write behaviour**: written when the user clicks **Start Match** or **Save Config**, never on every keystroke (avoids storage churn).

**Privacy**: stored entirely on the user's device. No personally identifiable data is transmitted anywhere; the names are user-chosen labels with no further use.

---

## 4. Page contract (single page, single document)

- One HTML document at `/index.html` (root of GitHub Pages site).
- All assets are same-origin under `/assets/`.
- No network requests after first load (verifiable via DevTools Network panel after a hard reload — required by FR-020 / SC-005).
- No service worker is required for v1; HTTP caching plus the static-asset model is sufficient for offline-after-load.
