# Form & UI Contract — Match-clock mode

**Feature**: 004-match-clock-mode  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

## Configuration screen DOM additions

A new `<fieldset>` is added immediately above the existing per-turn
fields and the new match-clock field, holding the two-radio mode
selector. The two timer fieldsets are wrapped so each can be hidden
without leaving orphaned `<label>`s.

```html
<fieldset class="field" id="cfg-mode-fieldset">
  <legend class="label">Modo de cronómetro</legend>
  <label class="radio">
    <input type="radio" name="cfg-mode" value="per-turn" checked />
    Por turno (con pool de reserva)
  </label>
  <label class="radio">
    <input type="radio" name="cfg-mode" value="per-match" />
    Por partida (cronómetro completo, sin reserva)
  </label>
</fieldset>

<div id="cfg-per-turn-group">
  <!-- existing #cfg-turn-seconds and #cfg-reserve-seconds fields -->
</div>

<div id="cfg-per-match-group" hidden>
  <div class="field">
    <label class="label" for="cfg-match-seconds">Tiempo por jugador (minutos)</label>
    <div class="control">
      <input id="cfg-match-seconds" class="input" type="number"
             min="1" max="180" step="1" value="75" inputmode="numeric" />
    </div>
    <p class="help">Cronómetro de partida estilo ajedrez. Por defecto: 75 minutos por jugador.</p>
  </div>
</div>
```

The element id `cfg-match-seconds` mirrors the `cfg-turn-seconds`
naming so the form-layer adapter is symmetric.

## Mode-toggle behaviour

When a radio in `cfg-mode-fieldset` changes, JavaScript:

1. Sets `cfg-per-turn-group.hidden = (selectedMode !== "per-turn")`.
2. Sets `cfg-per-match-group.hidden = (selectedMode !== "per-match")`.

No other state changes; both groups' typed values are preserved across
toggles within the session (R-004).

## Form read/write

| Action          | Behaviour |
|-----------------|-----------|
| `populateForm`  | Reads `config.mode`; checks the matching radio. Populates `cfg-turn-seconds` and `cfg-reserve-seconds` from `turnSeconds/60` and `reserveSeconds/60`. Populates `cfg-match-seconds` from `matchSeconds/60`. Toggles group visibility. |
| `readForm`      | Reads `mode` from the checked radio. Returns ALL field values multiplied by 60: `turnSeconds`, `reserveSeconds`, `matchSeconds`. The validator picks whichever the active mode requires. |

## Match-screen DOM additions

A new banner element is added below the two player cards, hidden by
default. It uses `id="match-over-banner"` so `render.js` can toggle
its visibility.

```html
<div id="match-over-banner" class="notification is-danger has-text-centered" hidden>
  <strong id="match-over-text">¡Tiempo agotado!</strong>
</div>
```

`#match-over-text` content is set per render to either:

- `"¡Tiempo agotado para [Player 1's name]!"`, or
- `"¡Tiempo agotado para [Player 2's name]!"`,

depending on which player's `turnRemainingMs === 0` (the active
player at the moment of transition is necessarily the one whose
clock just crossed zero, since only the active clock decrements).

## Player-card DOM in match-clock mode

In `render(appState)`, when `match.mode === "per-match"`:

- `#player-1-reserve` and `#player-2-reserve` are set to `hidden = true`.
- The two cards continue to show only `#player-N-name` and
  `#player-N-turn`, vertically centered as today.

In per-turn mode, both reserve elements are unhidden as before.

## Acceptance test mapping

| Spec scenario                                                    | Contract item |
|------------------------------------------------------------------|----------------|
| US1 §1 (mode chooser visible, "Por turno" default)               | Mode fieldset, radio `checked` |
| US1 §2 (per-match shows only the match-clock input)              | `cfg-per-match-group` visible, others hidden |
| US1 §4 (entering 60 → match shows 60:00 timers)                  | Form read flow + state.startMatch |
| US2 §3 (flag-fall → match-over banner)                           | Match-screen banner + render visibility |
| US2 §4 (Pause is no-op in match-over)                            | `pause` reducer guard (R-003) |
| US3 §1 (saved per-match config reload prefilled)                 | populateForm round-trip |
| Edge "card render" (FR-013)                                      | Reserve element `hidden` toggling |
