# Phase 1 Data Model: Blood Bowl Turn Chronometer

**Feature**: 001-bloodbowl-timer  
**Date**: 2026-05-08  
**Storage**: in-memory only (live match); `localStorage` for `Configuration` (key `bbtimer.config.v1`).

There are no persisted relational entities. The data model below describes the **client-side state shape** that drives rendering.

---

## Entity: `Configuration`

User-editable settings, captured on the configuration screen and reused across resets.

| Field             | Type                | Constraints                                  | Default        |
|-------------------|---------------------|----------------------------------------------|----------------|
| `player1Name`     | string              | trimmed; max 24 chars; falls back to `"Player 1"` if empty after trim | `"Player 1"`   |
| `player2Name`     | string              | trimmed; max 24 chars; falls back to `"Player 2"` if empty after trim | `"Player 2"`   |
| `turnSeconds`     | integer             | `> 0`, `<= 3600`                             | `240` (4 min)  |
| `reserveSeconds`  | integer             | `>= 0`, `<= 3600`                            | `0`            |

**Validation rule (FR-004)**: a `Configuration` is valid only if `turnSeconds > 0` and `reserveSeconds >= 0`. Invalid configurations block `start`.

**Persistence**: serialized to `localStorage` as JSON under `bbtimer.config.v1`. Reads on app load are best-effort (corrupt or absent → defaults).

---

## Entity: `PlayerClock`

Per-player clock state during a match.

| Field                 | Type     | Notes                                                                |
|-----------------------|----------|----------------------------------------------------------------------|
| `name`                | string   | Snapshot of `Configuration.playerNName` at match start.              |
| `turnRemainingMs`     | integer  | `>= 0`. Resets to `turnSeconds * 1000` whenever the player's turn begins. |
| `reserveRemainingMs`  | integer  | `>= 0`. Initialized to `reserveSeconds * 1000` at match start. Decreases monotonically across the match. |
| `state`               | enum     | Derived: one of `normal` \| `in_reserve` \| `exhausted`.            |

**Derivation rule** (`state`):
- `normal` if `turnRemainingMs > 0`.
- `in_reserve` if `turnRemainingMs == 0 && reserveRemainingMs > 0`.
- `exhausted` if `turnRemainingMs == 0 && reserveRemainingMs == 0`.

`state` is **never stored**; it is recomputed from the two numeric fields each frame.

---

## Entity: `Match`

The active session.

| Field                 | Type                                | Notes                                                  |
|-----------------------|-------------------------------------|--------------------------------------------------------|
| `phase`               | enum                                | `idle` (pre-start), `running`, `paused`, `finished`. |
| `players`             | `[PlayerClock, PlayerClock]`        | Index 0 = Player 1, index 1 = Player 2.               |
| `activeIndex`         | `0 \| 1`                            | Which player's clock is being decremented; meaningful only when `phase === "running"`. |
| `turnStartedAtPerfNow`| number \| null                      | `performance.now()` value captured the instant the current active turn began (or last resumed). `null` when not running. |
| `lastEndTurnAtPerfNow`| number \| null                      | Used for the 150 ms end-turn debounce (FR-019).        |
| `config`              | `Configuration`                     | Snapshot taken at `start()`; mutating the form afterwards does not affect the live match. |

**Phase transitions** (state machine):

```
            start()           endTurn() / autotick
   idle  ───────────▶  running ◀──────────────────┐
    ▲                   │  ▲                       │
    │ reset()           │  │ resume()              │
    │             pause()  │ pause()               │
    │                   ▼  │                       │
    │                 paused                       │
    │                   │                          │
    │                   │  reset()                 │
    └───────────────────┴──────────────────────────┘

            (finished is reserved for a future "match over"
             trigger; v1 stays in running/paused.)
```

Allowed inputs per phase:

| Phase     | Allowed user actions                |
|-----------|-------------------------------------|
| `idle`    | edit config, `start`                |
| `running` | `endTurn` (active player), `pause`, `reset` |
| `paused`  | `resume` (= toggle pause), `reset`  |

`endTurn` while `paused` is rejected (FR-014).

---

## Pure transitions (reducer-style)

The implementation will expose these as pure functions for testability (see R-008).

### `startMatch(config: Configuration): Match`
Returns a fresh `Match` with `phase = "running"`, both players' clocks set from `config`, `activeIndex = 0`, and `turnStartedAtPerfNow = performance.now()`.

### `idleMatch(config: Configuration): Match`
Returns a fresh `Match` with `phase = "idle"`, both players' clocks set from `config` (full per-turn time and full reserve), `activeIndex = 0`, `turnStartedAtPerfNow = null`, and `lastEndTurnAtPerfNow = null`. Used as the initial app state on load and as the post-`reset` shape — guarantees `render(state)` always has a valid match to draw, regardless of phase.

### `recompute(match: Match, now: number): Match`
For `phase === "running"`, computes `elapsed = now - match.turnStartedAtPerfNow`, applies the two-tier subtraction (R-003) to `match.players[activeIndex]`, and resets `turnStartedAtPerfNow = now` so subsequent calls accumulate correctly. Pure given `now`.

### `endTurn(match: Match, now: number, sideIndex: 0 | 1): Match`
Rejects (returns `match` unchanged) if any of:
- `phase !== "running"` (FR-014 — pause locks input),
- `sideIndex !== match.activeIndex` (FR-006 / FR-009 — only the active player's input flips the turn; pressing the inactive side's key or tapping the inactive card is a no-op),
- `now - lastEndTurnAtPerfNow < 150` (FR-019 — debounce).

Otherwise: calls `recompute(match, now)` first, restores `players[activeIndex].turnRemainingMs` to `config.turnSeconds * 1000`, flips `activeIndex`, sets `turnStartedAtPerfNow = now`, sets `lastEndTurnAtPerfNow = now`.

### `pause(match: Match, now: number): Match`
If `phase === "running"`: calls `recompute(match, now)` then sets `phase = "paused"`, `turnStartedAtPerfNow = null`. If `phase === "paused"`: sets `phase = "running"`, `turnStartedAtPerfNow = now` (resume). Otherwise no-op.

### `reset(match: Match, config: Configuration): Match`
Equivalent to `{ ...startMatch(config), phase: "idle", turnStartedAtPerfNow: null }`. Returns to the configuration screen.

---

## Validation rules (consolidated, mapped to FRs)

| Rule                                                                      | FR(s)                |
|---------------------------------------------------------------------------|----------------------|
| `turnSeconds > 0` and `<= 3600`                                           | FR-003, FR-004       |
| `reserveSeconds >= 0` and `<= 3600`                                       | FR-003, FR-004       |
| Empty player names fall back to `"Player 1"` / `"Player 2"`               | FR-002, edge cases   |
| `endTurn` is rejected while `paused`                                      | FR-014               |
| `endTurn` is rejected when `sideIndex !== match.activeIndex`              | FR-006, FR-009       |
| `endTurn` is rejected within 150 ms of previous accepted `endTurn`        | FR-019               |
| Held key (`event.repeat === true`) does not flip the turn                 | FR-019               |
| `turnRemainingMs` and `reserveRemainingMs` are floored at `0`             | FR-012               |
| Active player flips on every accepted `endTurn`                           | FR-006, FR-008       |
