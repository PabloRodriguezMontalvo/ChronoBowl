# Data Model — Configure timers in minutes

**Feature**: 003-minutes-input  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

This feature does **not** introduce any new persistent entities. It adds a
single transient view-model type at the UI boundary. The pre-existing
`Config` and `Match` entities are unchanged.

## Existing entities (unchanged)

### Config (persisted as `bbtimer.config.v1`)

| Field           | Type    | Unit    | Notes                          |
|-----------------|---------|---------|--------------------------------|
| `schemaVersion` | number  | —       | Always `1` (no migration)      |
| `player1Name`   | string  | —       | Trimmed, max 24 chars          |
| `player2Name`   | string  | —       | Trimmed, max 24 chars          |
| `turnSeconds`   | integer | seconds | 1 ≤ value ≤ 3600               |
| `reserveSeconds`| integer | seconds | 0 ≤ value ≤ 3600               |

### Match (in-memory)

Unchanged. Continues to store `turnRemainingMs` and `reserveRemainingMs`
in milliseconds.

## New transient type (UI boundary only)

### FormValues (view-model)

Lives only inside `assets/js/main.js`. Never persisted, never crosses the
boundary into pure helpers.

| Field           | Type    | Unit    | Notes                              |
|-----------------|---------|---------|------------------------------------|
| `player1Name`   | string  | —       | Read directly from `<input>`        |
| `player2Name`   | string  | —       | Read directly from `<input>`        |
| `turnMinutes`   | integer | minutes | 1 ≤ value ≤ 60                     |
| `reserveMinutes`| integer | minutes | 0 ≤ value ≤ 60                     |

## Pure transformations

```text
toFormValues(config: Config): FormValues
  turnMinutes    = Math.round(config.turnSeconds    / 60)
  reserveMinutes = Math.round(config.reserveSeconds / 60)

fromFormValues(form: FormValues): RawValidatorInput
  turnSeconds    = form.turnMinutes    * 60
  reserveSeconds = form.reserveMinutes * 60
```

`Math.round` on the read path tolerates the (non-occurring in normal use)
case of legacy storage values that are not exact multiples of 60.

## Validator surface change

`validateConfig(raw)` continues to return `{ config }` or `{ error }`. The
function is renamed nowhere; only its bounds (in seconds) and its error
strings are reworded. Behavior contract:

| Failure case            | New error message (Spanish)                                |
|-------------------------|------------------------------------------------------------|
| Missing/non-numeric turn | `"El tiempo por turno debe ser un número entero positivo de minutos."` |
| `turnSeconds <= 0`       | `"El tiempo por turno debe ser al menos 1 minuto."`        |
| `turnSeconds > 3600`     | `"El tiempo por turno no puede superar 60 minutos."`       |
| Negative reserve         | `"El tiempo de reserva no puede ser negativo."`            |
| `reserveSeconds > 3600`  | `"El tiempo de reserva no puede superar 60 minutos."`      |
| Non-multiple of 60       | `"Introduce un número entero de minutos."`                 |

The non-multiple-of-60 case is the new integer guard from R-002. It is
checked **after** unit conversion in `main.js`, so the validator can
remain in seconds and the message still talks to the user in minutes
(the conversion was lossless if and only if the original input was a
whole number of minutes).
