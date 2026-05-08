# Data Model — Turn-Transition Sound Cues

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)

This feature does not introduce new persistent domain entities beyond the
mute preference. It adds one pure helper to `state.js` and a small in-memory
state object owned by `audio.js`.

## Persistent state

### `AudioPrefs` (localStorage)

| Field           | Type      | Notes                                              |
| --------------- | --------- | -------------------------------------------------- |
| `schemaVersion` | `1`       | Literal; rejects any other value (fall back to defaults) |
| `muted`         | `boolean` | `true` if user has silenced cues                   |

- Storage key: `bbtimer.audio.v1`
- Default when key is missing or schema fails: `{ schemaVersion: 1, muted: false }`
- Read by `loadAudioPrefs()` in `assets/js/storage.js`
- Written by `saveAudioPrefs(prefs)` on every mute toggle

The mute preference is intentionally separate from `bbtimer.config.v1` so
the existing "Borrar configuración guardada" button does not touch it
(per R-007).

## In-memory state

### `Cue` (constant — defined by `audio.js`)

| Field        | Type     | Notes                                                |
| ------------ | -------- | ---------------------------------------------------- |
| `id`         | `string` | `"enterReserve"` or `"exhausted"`                    |
| `srcOgg`     | `string` | Path to the `.ogg` asset (e.g. `./assets/audio/enter-reserve.ogg`) |
| `srcMp3`     | `string` | Path to the `.mp3` fallback                          |
| `volume`     | `number` | Default playback volume in `[0, 1]`                  |

There are exactly two cues. The constant is private to `audio.js`.

### `AudioRuntime` (in-memory — created by `audio.js`)

| Field          | Type                          | Notes                                                              |
| -------------- | ----------------------------- | ------------------------------------------------------------------ |
| `prefs`        | `AudioPrefs`                  | Most recently loaded/saved preferences                             |
| `unlocked`     | `boolean`                     | `true` after the first user-gesture-triggered priming play         |
| `triggered`    | `Record<TagId, boolean>`      | One bool per `(player, cue)` tag; `true` once that cue has played for the current turn segment |
| `elements`     | `Record<CueId, HTMLAudioElement>` | One preloaded `<audio>` element per cue                        |

`TagId` is one of:

- `"p1:enteredReserve"`, `"p1:enteredExhausted"`,
- `"p2:enteredReserve"`, `"p2:enteredExhausted"`.

## Pure transitions (added to `state.js`)

### `derivePlayerVisualStateDelta(prevMatch, nextMatch) → TagId[]`

Returns the list of "transition crossed" tags between two consecutive
match snapshots.

For each player index `i ∈ {0, 1}`:

- Let `prevVS = playerVisualState(prevMatch.players[i])` (existing helper).
- Let `nextVS = playerVisualState(nextMatch.players[i])`.
- If `prevVS === "normal"` and `nextVS === "in_reserve"` → emit `"p{i+1}:enteredReserve"`.
- If `prevVS === "in_reserve"` and `nextVS === "exhausted"` → emit `"p{i+1}:enteredExhausted"`.
- If `prevVS === "normal"` and `nextVS === "exhausted"` → emit `"p{i+1}:enteredExhausted"` only (skip `enteredReserve`; covers the "tab returned from background and skipped a state" edge case in spec, and the strict-mode `reserveSeconds === 0` edge case where there is no in-reserve state to enter).
- Any other transition (no change, going "back" via reset) → emit nothing for that player.

The function is pure (no DOM, no time, no `localStorage`), accepts two
arbitrary match snapshots, and returns a fresh array each call. Order is
`p1` before `p2`. An empty array signals "no audio side-effect this frame".

> Note: `prevVS === "exhausted" && nextVS === "exhausted"` returns `[]` —
> staying in exhausted does not retrigger.

### `playerVisualState(player)` — UNCHANGED

Already exported from `state.js` by feature 001:

```text
turnRemainingMs > 0           → "normal"
turnRemainingMs == 0 & res > 0 → "in_reserve"
both == 0                      → "exhausted"
```

## Lifecycle of cue-triggered flags (in `audio.js`)

| Event                                | Effect on `runtime.triggered`                                       |
| ------------------------------------ | ------------------------------------------------------------------- |
| `audio.fireForDelta([tag, …])`       | If `runtime.triggered[tag] === false`, set it to `true` and call the underlying `playCue(cue)`. If already `true`, do nothing. |
| `audio.handleEndTurn(newActiveIndex)` | Clear all four flags (the new active player gets a fresh segment). The simplest defensible policy — see R-006. |
| `audio.handleReset()`                | Clear all four flags                                                |
| `audio.handleMatchStart()`           | Clear all four flags                                                |
| pause / resume                       | No change (intentional)                                             |

## Shape summary

```text
match (existing — UNCHANGED)
└── players[i] (existing — UNCHANGED)
    ├── name
    ├── turnRemainingMs
    └── reserveRemainingMs

AudioPrefs       (new — localStorage)
└── { schemaVersion: 1, muted: boolean }

AudioRuntime     (new — in-memory inside audio.js)
├── prefs: AudioPrefs
├── unlocked: boolean
├── triggered: Record<TagId, boolean>
└── elements: Record<CueId, HTMLAudioElement>
```

No changes to the existing `Match`, `PlayerClock`, or `Config` shapes.
