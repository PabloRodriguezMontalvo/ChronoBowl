# Form Contract — Configure timers in minutes

**Feature**: 003-minutes-input  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

The single external interface this feature exposes is the **configuration
form**. There are no APIs, no CLI, no message protocols. This document
pins the user-visible contract.

## DOM

| Element id              | Type                | Attribute deltas vs. previous version                                              |
|-------------------------|---------------------|------------------------------------------------------------------------------------|
| `cfg-turn-seconds`      | `<input type=number>` | `min="1"`, `max="60"`, `step="1"`, default `value="4"`                            |
| `cfg-reserve-seconds`   | `<input type=number>` | `min="0"`, `max="60"`, `step="1"`, default `value="5"`                            |

The element ids are intentionally kept (`*-seconds`) to avoid touching
unrelated cached lookups in `main.js`. Renaming them would be churn for
no functional benefit; the id is internal vocabulary, the visible label
is what matters to the user.

## Visible labels (Spanish)

| Field            | Label text                          | Help text                                                                                  |
|------------------|-------------------------------------|--------------------------------------------------------------------------------------------|
| Per-turn timer   | `Tiempo por turno (minutos)`        | `Por defecto: 4 minutos.`                                                                  |
| Reserve pool     | `Tiempo de reserva (minutos)`       | `Pool de tiempo extra que se consume cuando se agota el turno. 0 = modo estricto.`         |

The `(segundos)` substring is replaced by `(minutos)` in both labels and
the per-turn help text. The reserve help text loses the seconds reference
naturally (it never mentioned the unit).

## Read flow (page load → form populated)

```text
loadConfig() : { ..., turnSeconds: 240, reserveSeconds: 300 }
            ↓
toFormValues(...)            // divide by 60, round
            ↓
populateForm({turnMinutes:4, reserveMinutes:5})
            ↓
input.value = "4"
input.value = "5"
```

## Write flow (submit → match start)

```text
readForm() : { player1Name, player2Name, turnMinutes:"4", reserveMinutes:"5" }
            ↓
fromFormValues(...)          // multiply by 60
            ↓
validateConfig({ turnSeconds:240, reserveSeconds:300, ...names })
            ↓
{ config } or { error: "<minute-worded message>" }
```

## Acceptance test mapping

| Spec scenario                                                         | This contract |
|-----------------------------------------------------------------------|----------------|
| US1 §1 (defaults are 4 and 5 with min unit label)                     | Visible labels + default values |
| US1 §2 (entering 3/4 → match shows 3:00 timers)                       | Write flow |
| US1 §4 (reload → form re-populates with minute values)                | Read flow |
| US2 §1–§3 (validation messages refer to minutes)                      | Validator surface (data-model.md) |
| Edge "decimal entry" (1.5 rejected)                                   | Validator integer guard, applied to the **post-conversion** seconds value |

## Backward compatibility

A user with a saved `bbtimer.config.v1` from any prior version sees their
existing values transparently expressed in minutes after the read flow
runs. No migration needed. Storage shape is invariant under this feature.
