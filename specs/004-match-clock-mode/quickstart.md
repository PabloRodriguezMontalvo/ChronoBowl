# Quickstart — Match-clock mode

**Feature**: 004-match-clock-mode  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

## 1. Run locally

```powershell
# From repo root
python -m http.server 8000
# Open http://localhost:8000/ in a browser
```

## 2. Run the test suite

```powershell
node --test tests
```

Expected after this feature lands: **70+ tests passing** (63 pre-existing
+ 4 new match-clock + 3 new validateConfig + 1 new visualStateDelta).

## 3. Manual acceptance walkthrough

### A — Mode chooser default (US1 §1)

1. In a private window (no localStorage), open the app.
2. Confirm the configuration screen shows a "Modo de cronómetro" section
   with two radio buttons. "Por turno" is checked.
3. Confirm the per-turn fields (`(minutos)` per feature 003) are shown
   and the `Tiempo por jugador (minutos)` input is hidden.

### B — Switch to per-match (US1 §2)

1. Click the "Por partida" radio.
2. Confirm the per-turn fields disappear and a single
   `Tiempo por jugador (minutos)` input appears with default value `75`.
3. Click "Por turno" → confirm the original fields reappear with
   defaults `4` / `5`. Switch back → match-clock value is still `75`.

### C — Per-match countdown (US1 §4 + US2 §1)

1. Set "Por partida" to `2` (so the test runs in under 5 minutes).
2. Click "Crear partida" → "▶ Empezar".
3. Confirm both player cards show `2:00` initially, the active card has
   the `normal` (green pulse) treatment, the inactive card is dimmed,
   and **no reserve element is visible** on either card.
4. Wait ~30 s without interacting → active card shows `1:30` and the
   inactive card still shows `2:00`.

### D — End-turn does not refill (US2 §2)

1. Continuing from C with active card around `1:30`, press `A` (or tap
   the active card).
2. Confirm the previously active card freezes at its current value
   (≈ `1:30`, not `2:00`) and the other card becomes active and starts
   counting down from `2:00`.

### E — Flag-fall → match-over (US2 §3 + §4)

1. Continuing in match-clock mode, let the active player's clock run
   down to `0:00`.
2. Confirm: the card flips to the exhausted (red) visual state, the
   "exhausted" audio cue plays once (if audio is unmuted), and a red
   banner reading "¡Tiempo agotado para …!" appears below the cards.
3. Press `A`, `L`, tap a card, press Pause → all are no-ops (the
   banner stays, no clock change).
4. Click "↺ Reiniciar" → confirm the app returns to the configuration
   screen (or to a fresh "ready" match per the existing reset flow)
   and the banner disappears.

### F — Pause/resume in match-clock mode (US2 §4)

1. Reconfigure for a longer test (e.g. `5` minutes) and start.
2. Press `Space` → both clocks freeze, "PAUSA" overlay shown.
3. Press `Space` again → only the active player's clock resumes.

### G — Persistence round-trip (US3 §1)

1. Configure "Por partida" `90` minutes and start a match. Reset.
2. Reload the page.
3. Confirm the form opens with "Por partida" selected and value `90`.

### H — Per-turn mode regression check (SC-003)

1. After F, switch back to "Por turno", set `4` / `5`, start a match.
2. Verify the match looks and behaves byte-for-byte like before this
   feature shipped: per-turn refill on end-turn, reserve consumption,
   feature 002 cues. No new behaviour intrudes.

### I — Legacy save compatibility (SC-004)

1. In DevTools, set
   `localStorage["bbtimer.config.v1"]` to a legacy
   `{"schemaVersion":1,"player1Name":"P1","player2Name":"P2","turnSeconds":240,"reserveSeconds":300}`
   (no `mode`, no `matchSeconds`).
2. Reload.
3. Confirm the form opens in "Por turno" mode with values `4` / `5`.
   Confirm switching to "Por partida" shows the default `75`.

## 4. Definition of done

- All 9 manual scenarios above (A–I) pass on Chrome.
- `node --test tests` is green (≥ 70 tests).
- Zero JavaScript console errors in any scenario.
- The Network tab shows no new asset requests vs. feature 003 (no new
  libraries, no new audio files).
