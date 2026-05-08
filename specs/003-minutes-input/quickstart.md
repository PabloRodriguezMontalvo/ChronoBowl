# Quickstart — Configure timers in minutes

**Feature**: 003-minutes-input  
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

Expected after this feature lands: **55+ tests passing**, all green.

## 3. Manual acceptance walkthrough

### A — Defaults (US1 §1)

1. In a private window (no localStorage), open the app.
2. Confirm the two timer fields show **4** and **5** respectively, and
   the labels say `Tiempo por turno (minutos)` and `Tiempo de reserva
   (minutos)`.
3. Confirm the per-turn help text says `Por defecto: 4 minutos.`.

### B — Submit & display (US1 §2)

1. Type `3` in the per-turn field and `4` in the reserve field.
2. Click **Crear partida** then **▶ Empezar**.
3. Confirm the active player's turn timer reads `3:00` and reserve `4:00`.

### C — Reload round-trip (US1 §4)

1. After step B, reload the page.
2. Confirm the form fields show `3` and `4`.

### D — Validation in minutes (US2)

1. Empty the per-turn field, click **Crear partida**.
2. Confirm the inline error mentions **minutos** (not segundos).
3. Type `0` and submit; confirm `"al menos 1 minuto"` message.
4. Type `1.5` and submit; confirm `"número entero de minutos"` message.

### E — Strict mode (Edge case)

1. Set per-turn `2` and reserve `0`. Submit and start.
2. Confirm reserve shows `0:00` and after 2 minutes the active player
   immediately enters the exhausted state (red, exhausted cue plays
   if not muted).

### F — Backward compatibility (SC-004)

1. In DevTools, set `localStorage["bbtimer.config.v1"]` to
   `{"schemaVersion":1,"player1Name":"P1","player2Name":"P2","turnSeconds":240,"reserveSeconds":300}`.
2. Reload.
3. Confirm the form shows **4** and **5**, not **240** and **300**.

## 4. Definition of done

- All 5 manual scenarios above pass on Chrome and one of {Firefox, Safari}.
- `node --test tests` is green (existing 54 + new validateConfig tests).
- No occurrence of "segundos" remains in `index.html` (per SC-002).
- Pre-existing saved configs continue to round-trip through reload.
