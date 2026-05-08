# Storage Contract — `bbtimer.config.v1` (additive)

**Feature**: 004-match-clock-mode  
**Phase**: 1 (Design)  
**Date**: 2026-05-08

## Schema

`schemaVersion` remains **1**. New fields are additive; loaders MUST
default missing fields per the table below. Writers MUST always emit
all fields.

```jsonc
{
  "schemaVersion": 1,
  "player1Name": "Alice",
  "player2Name": "Bob",
  "mode": "per-turn",         // NEW: "per-turn" | "per-match"
  "turnSeconds": 240,         // per-turn meaning only
  "reserveSeconds": 300,      // per-turn meaning only
  "matchSeconds": 4500        // NEW: per-match meaning only (75 min)
}
```

## Load defaults

| Missing field    | Default value          |
|------------------|------------------------|
| `schemaVersion`  | reject (return null)   |
| `player1Name`    | `"Player 1"`           |
| `player2Name`    | `"Player 2"`           |
| `mode`           | `"per-turn"`           |
| `turnSeconds`    | `240`                  |
| `reserveSeconds` | `300`                  |
| `matchSeconds`   | `4500`                 |

## Forward / backward compatibility

| Reader / Writer pairing                         | Result |
|-------------------------------------------------|--------|
| New writer → new reader                          | All fields present, full fidelity. |
| New writer → old reader (pre-feature 004)        | Old reader reads `turnSeconds`/`reserveSeconds`; ignores `mode` and `matchSeconds`. User's per-turn config is preserved. |
| Old writer → new reader (legacy save)            | New reader applies defaults: `mode = "per-turn"`, `matchSeconds = 4500`. User's per-turn experience is byte-for-byte unchanged (SC-004). |

## Audio prefs key

`bbtimer.audio.v1` is unchanged by this feature. Reads and writes
continue per feature 002.
