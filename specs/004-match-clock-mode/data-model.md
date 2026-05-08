# Data Model — Match-clock mode

**Feature**: 004-match-clock-mode  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

## Persisted state

### `Config` (persisted as `bbtimer.config.v1`)

`schemaVersion` stays at `1`. New fields are additive; missing fields
get the defaults shown below.

| Field            | Type                            | Unit    | Default (load) | Notes                                              |
|------------------|---------------------------------|---------|----------------|----------------------------------------------------|
| `schemaVersion`  | number                          | —       | `1`            | Unchanged.                                         |
| `player1Name`    | string                          | —       | `"Player 1"`   | Unchanged.                                         |
| `player2Name`    | string                          | —       | `"Player 2"`   | Unchanged.                                         |
| `mode`           | `"per-turn"` \| `"per-match"`   | —       | `"per-turn"`   | **NEW.** Missing on legacy saves → defaults to `per-turn`. |
| `turnSeconds`    | integer                         | seconds | `240`          | Per-turn meaning only. Ignored when `mode === "per-match"`. |
| `reserveSeconds` | integer                         | seconds | `300`          | Per-turn meaning only. Ignored when `mode === "per-match"`. |
| `matchSeconds`   | integer                         | seconds | `4500` (75 m)  | **NEW.** Per-match meaning only. Ignored when `mode === "per-turn"`. |

The per-mode fields are independent: switching modes preserves each
mode's last committed value.

### `AudioPrefs` (`bbtimer.audio.v1`)

Unchanged. Untouched by this feature.

## Runtime state

### `Match`

| Field                    | Type            | Notes                                                                                  |
|--------------------------|-----------------|----------------------------------------------------------------------------------------|
| `phase`                  | enum            | `idle` \| `ready` \| `running` \| `paused` \| **`match-over`** *(NEW)*                 |
| `mode`                   | enum            | **NEW.** `"per-turn"` \| `"per-match"`. Copied from config at match-creation.          |
| `players[i].name`        | string          | Unchanged.                                                                             |
| `players[i].turnRemainingMs` | integer ms  | Per-turn budget *(per-turn mode)* OR match-clock budget *(per-match mode)*.            |
| `players[i].reserveRemainingMs` | integer ms | Reserve pool *(per-turn mode)* OR always `0` *(per-match mode)*.                       |
| `activeIndex`            | 0 \| 1          | Unchanged.                                                                             |
| `turnStartedAtPerfNow`   | number \| null  | Unchanged. Cleared on `match-over`.                                                    |
| `lastEndTurnAtPerfNow`   | number \| null  | Unchanged.                                                                             |
| `config`                 | `Config`        | Unchanged.                                                                             |

`reserveRemainingMs` being permanently zero in match-clock mode is what
suppresses feature 002's "entered reserve" cue without any conditional
audio code (R-001).

## Pure-helper changes

### `defaultConfig()`

Returns the new shape with `mode: "per-turn"`, `matchSeconds: 4500`.

### `validateConfig(raw)`

The validator becomes mode-aware. Pseudocode:

```text
mode = raw.mode === "per-match" ? "per-match" : "per-turn"   // default

if mode === "per-turn":
    (existing checks on turnSeconds and reserveSeconds, in seconds)
    return { config: { ...names, mode, turnSeconds, reserveSeconds, matchSeconds: <unchanged or default> } }

else:  // per-match
    matchSeconds = Number(raw.matchSeconds)
    reject NaN with "número entero positivo de minutos"
    reject ≤ 0 with "al menos 1 minuto"
    reject > 10800 (180 min × 60) with "no puede superar 180 minutos"
    reject matchSeconds % 60 !== 0 with "Introduce un número entero de minutos"
    return { config: { ...names, mode, matchSeconds, turnSeconds: <unchanged or default>, reserveSeconds: <unchanged or default> } }
```

The "preserve the inactive mode's values" behaviour comes from the
form layer passing through both modes' current input values on submit;
the validator just checks whichever mode is active.

### `idleMatch(config)` and `startMatch(config, now)`

When `config.mode === "per-match"`, both players' `turnRemainingMs` is
seeded from `config.matchSeconds * 1000` and `reserveRemainingMs` is
seeded to `0`. The new `match.mode` field is set from `config.mode`.

### `recompute(match, now)`

Existing two-tier subtraction remains unchanged for per-turn mode. For
per-match mode, the `reserveRemainingMs` term is irrelevant because it
is `0` and the existing floor-at-zero logic already produces the right
end-state. **New behaviour**: at the end of `recompute`, if
`match.mode === "per-match"` AND the active player's
`turnRemainingMs === 0` AND `match.phase === "running"`, return a copy
with `phase: "match-over"` and `turnStartedAtPerfNow: null`.

### `endTurn(match, now, sideIndex)`

Add a guard at the top: `if (match.phase === "match-over") return match`.
Add a per-mode branch in the body: when `match.mode === "per-match"`,
**skip** the `turnRemainingMs` refill (the only reason the original
code restored the timer was to start a fresh per-turn budget for the
ending player; in match-clock mode the ending player's clock pauses
where it stopped). Everything else (debounce, side-guard, flip
activeIndex, set new `turnStartedAtPerfNow`) is unchanged.

### `pause(match, now)`

Add the same `match-over` no-op guard. Otherwise unchanged.

### `reset(_match, config)`

Unchanged. Returns a fresh `idleMatch(config)`, which now correctly
honors the mode.

### `derivePlayerVisualStateDelta(prevMatch, nextMatch)` (feature 002)

**Unchanged.** No mode parameter, no mode awareness. Match-clock mode
naturally never crosses `normal → in_reserve` because reserve is `0`.

## Validation surface (Spanish error strings)

| Failure case                                  | Message                                                       |
|-----------------------------------------------|---------------------------------------------------------------|
| (per-turn) Missing/non-numeric turn           | `"El tiempo por turno debe ser un número entero positivo de minutos."` *(unchanged)* |
| (per-turn) `turnSeconds <= 0`                 | `"El tiempo por turno debe ser al menos 1 minuto."`           |
| (per-turn) `turnSeconds > 3600`               | `"El tiempo por turno no puede superar 60 minutos."`          |
| (per-turn) Negative reserve                   | `"El tiempo de reserva no puede ser negativo."`               |
| (per-turn) `reserveSeconds > 3600`            | `"El tiempo de reserva no puede superar 60 minutos."`         |
| (any) Non-multiple of 60                      | `"Introduce un número entero de minutos."` *(unchanged)*      |
| (per-match) Missing/non-numeric match clock   | `"El tiempo por jugador debe ser un número entero positivo de minutos."` |
| (per-match) `matchSeconds <= 0`               | `"El tiempo por jugador debe ser al menos 1 minuto."`         |
| (per-match) `matchSeconds > 10800`            | `"El tiempo por jugador no puede superar 180 minutos."`       |
