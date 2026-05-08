# Audio Contract — Turn-Transition Sound Cues

**Feature**: [spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Data Model**: [../data-model.md](../data-model.md)

This contract defines the cue trigger conditions, asset metadata, and the
public surface of the new `audio.js` module. It is the source of truth that
the implementation and the unit tests both reference.

## 1. Cue inventory

The app has exactly two cues. They are addressed by the IDs below in code,
asset filenames, and tests.

| Cue ID          | Trigger                                                      | Length    | Volume | Description (asset character)            |
| --------------- | ------------------------------------------------------------ | --------- | ------ | ---------------------------------------- |
| `enterReserve`  | Active player's per-turn timer first crosses zero with reserve > 0 | ≤ 500 ms | `0.5`  | Soft, single-shot, gentle (FR-005)       |
| `exhausted`     | Both timers first reach zero (or per-turn timer reaches zero in strict mode where reserve = 0) | ≤ 500 ms | `0.5`  | Audibly distinct from `enterReserve` (FR-013) |

## 2. Asset metadata

Each cue ships in two encodings to maximize browser compatibility:

| Cue ID         | OGG path                            | MP3 path                            |
| -------------- | ----------------------------------- | ----------------------------------- |
| `enterReserve` | `./assets/audio/enter-reserve.ogg`  | `./assets/audio/enter-reserve.mp3`  |
| `exhausted`    | `./assets/audio/exhausted.ogg`      | `./assets/audio/exhausted.mp3`     |

### Licensing requirements

- Both source files MUST be obtained from a royalty-free / CC0 / Public-
  Domain or equivalent permissive source (Pixabay license, Creative Commons
  Zero, Mixkit license).
- A `LICENSE-AUDIO.md` MUST exist at the repo root and contain, for each
  asset:
  - filename in the repo,
  - source URL,
  - source platform (e.g. "Pixabay", "freesound.org", "mixkit.co"),
  - license name,
  - author/contributor name (where the source provides one),
  - download date.

## 3. Public API of `audio.js`

`audio.js` exports a factory:

```text
createAudio({ playCue, prefs }?) → AudioRuntime
```

- The optional `playCue` injection accepts a function `(cueId) => void`. If
  omitted, the production `playCue` is constructed internally from
  `HTMLAudioElement`. Used by tests to substitute a stub recorder.
- The optional `prefs` injection accepts `{ load(), save(prefs) }`. If
  omitted, defaults to `loadAudioPrefs` / `saveAudioPrefs` from
  `storage.js`. Used by tests to bypass `localStorage`.

The returned `AudioRuntime` exposes exactly these methods:

| Method                              | Description                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `unlock()`                          | Idempotent. Performs the priming play+pause on a user gesture. Safe to call repeatedly.      |
| `fireForDelta(tags: TagId[])`       | For each tag, if the corresponding `triggered` flag is `false` AND `prefs.muted === false`, plays the cue and sets the flag to `true`. |
| `handleEndTurn()`                   | Clears all four `triggered` flags.                                                          |
| `handleReset()`                     | Clears all four `triggered` flags.                                                          |
| `handleMatchStart()`                | Clears all four `triggered` flags AND calls `unlock()`.                                     |
| `setMuted(muted: boolean)`          | Updates `runtime.prefs.muted`, persists via the `prefs` adapter.                            |
| `getMuted() → boolean`              | Returns the current mute state.                                                              |

No other methods are exposed. No other module reads from `runtime.triggered`.

## 4. Trigger truth table

For any two consecutive frames where `prevVS` is the active player's prior
visual state and `nextVS` is the current visual state, the trigger
behaviour is:

| `prevVS`     | `nextVS`     | Tag emitted            | Audible?         |
| ------------ | ------------ | ---------------------- | ---------------- |
| `normal`     | `normal`     | (none)                 | no               |
| `normal`     | `in_reserve` | `…:enteredReserve`     | yes (first time) |
| `normal`     | `exhausted`  | `…:enteredExhausted`   | yes (first time) |
| `in_reserve` | `in_reserve` | (none)                 | no               |
| `in_reserve` | `exhausted`  | `…:enteredExhausted`   | yes (first time) |
| `exhausted`  | `exhausted`  | (none)                 | no               |

"Going backwards" (e.g. via reset, after which `prevVS === "exhausted"`,
`nextVS === "normal"`) emits no tag because the lifecycle hooks
(`handleReset`, `handleMatchStart`) already clear the `triggered` flags;
on the next forward transition the cue plays again normally.

While `match.phase !== "running"` (idle or paused), `recompute` is a no-op
and produces no state change → no transition tags → no audio. This
satisfies FR-008.

## 5. Mute & volume

- The factory loads `prefs.load()` once at construction.
- Default volume is `0.5` (set on each `HTMLAudioElement` at preload).
- A continuous volume slider is out of scope for v1 (Assumption in spec).
- `setMuted(true)` immediately silences subsequent cues. It does NOT pause
  any cue currently playing — but cues are ≤ 500 ms so this is acceptable.

## 6. Failure mode (FR-010)

- If `audio.preload` (the `HTMLAudioElement.load()` step) fails or the file
  cannot be located, the cue's element is still kept in the elements map,
  but `play()` will reject. The factory wraps every call to `play()` in a
  `.catch(() => {})` so rejections are silent.
- If the device has no audio output, the browser typically resolves
  `play()` successfully and produces no sound — no special handling needed.
- The match render loop must not be affected by audio failures.

## 7. Test coverage matrix

`tests/state.visualStateDelta.test.mjs` (pure helper):

- 6 same-state pairs → empty arrays
- 3 forward transitions for each player → correct single-tag arrays
- 1 background-skip transition (`normal → exhausted` directly) → only `enteredExhausted`
- 1 inactive-player no-op (active player transitions, inactive does not)

`tests/audio.cueTrigger.test.mjs` (factory with stub `playCue` + in-memory `prefs`):

- First `fireForDelta(["p1:enteredReserve"])` calls `playCue("enterReserve")`
- Second consecutive `fireForDelta(["p1:enteredReserve"])` does NOT call again
- After `handleEndTurn()`, the flag is reset and the next call plays again
- After `handleReset()` → all four flags cleared
- After `handleMatchStart()` → all four flags cleared
- `setMuted(true)` followed by `fireForDelta` with any tag → `playCue` not called
- `setMuted(false)` then `fireForDelta` for an unfired tag → `playCue` called
- `setMuted` writes to the injected `prefs.save`
- Construction with `prefs.load()` returning `{muted:true}` honors the persisted preference
