# Feature Specification: Turn-Transition Sound Cues

**Feature Branch**: `002-turn-sounds`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Necesitaríamos añadir dos sonidos simples y no molesto para el resto de jugadores del torneo, uno para cuando el timer base se agote y se esté usando el pool y otro para cuando se agote el pool"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Audible cue when entering the reserve pool (Priority: P1)

While focused on the board (dice rolls, piece placement) the active player cannot reliably watch the digits of the on-screen clock. They need a short, discreet sound that tells them — without looking — that the per-turn timer has just hit zero and they are now eating into their reserve pool.

**Why this priority**: This is the primary value the user requested. Without a sound here the reserve pool is effectively invisible to the active player during dense game phases, and the visual color shift alone is easy to miss in peripheral vision under tournament lighting.

**Independent Test**: Configure a 5-second turn with a 30-second reserve. Start the match, look away from the screen, and wait. When the per-turn timer expires the app must emit a single, brief, low-volume sound. The sound is heard exactly once at the transition moment and is not retriggered as the reserve continues to drain.

**Acceptance Scenarios**:

1. **Given** the active player has `turnRemainingMs > 0` and `reserveRemainingMs > 0`, **When** the per-turn timer crosses zero during a running match, **Then** the "entering reserve" sound plays exactly once and the visual state simultaneously becomes the in-reserve color.
2. **Given** the active player has just consumed a few seconds of reserve, **When** subsequent animation frames continue to subtract from the reserve, **Then** the "entering reserve" sound is NOT replayed.
3. **Given** the player ends their turn (key `A`/`L` or tap) while still in normal turn time, **When** the next active player begins their turn, **Then** the "entering reserve" sound does NOT play (their per-turn timer has not crossed zero).

---

### User Story 2 — Audible cue when the reserve pool is exhausted (Priority: P1)

The active player needs a clearly different second sound the moment their reserve is fully gone, because that is the point at which they have run out of all allotted time. From here on, continuing to take additional time is something the opponent and the tournament organizer may want to flag.

**Why this priority**: The second of the two sounds the user explicitly asked for. Together with US1 it forms the minimum acceptable scope of this feature; one without the other is incomplete.

**Independent Test**: Configure a 3-second turn with a 5-second reserve. Start the match, do nothing. After 8 seconds total the app must emit a second, distinct sound (different pitch/timbre from US1) at the moment both timers reach zero. The exhausted state visual (danger color + shake) appears at the same moment.

**Acceptance Scenarios**:

1. **Given** the active player has `turnRemainingMs === 0` and `reserveRemainingMs > 0`, **When** the reserve crosses zero during a running match, **Then** the "exhausted" sound plays exactly once.
2. **Given** the active player has been exhausted for several seconds and both clocks display `0:00`, **When** subsequent frames render, **Then** the "exhausted" sound is NOT replayed.
3. **Given** strict mode is configured (reserve = 0 seconds), **When** the per-turn timer crosses zero, **Then** the "exhausted" sound plays once and the "entering reserve" sound does NOT play (there is no reserve to enter).

---

### User Story 3 — Mute toggle for tournament-quiet rooms (Priority: P2)

Some tournament rooms are quieter than others. The active pair may be asked by an organizer to play silently, or the player may simply prefer relying on the visual cues. A single mute control on the match screen lets them silence the cues for the rest of the match (and remembers the choice for future matches on the same device).

**Why this priority**: The user's framing — "no molesto para el resto de jugadores del torneo" — makes a mute affordance highly desirable for real tournament use, but the feature still delivers value without it (sounds are quiet by default). Hence P2 rather than P1.

**Independent Test**: Start a match, click the mute toggle. Cause both transitions (reserve start and exhausted). No sound is heard. Reload the page and start a new match. The mute toggle is still active and no sounds play.

**Acceptance Scenarios**:

1. **Given** the mute toggle is OFF, **When** either transition occurs, **Then** the corresponding sound plays at the configured volume.
2. **Given** the mute toggle is ON, **When** either transition occurs, **Then** no sound plays and no visible disruption to the rest of the UI occurs.
3. **Given** the user toggled mute during a previous match, **When** they reload the page and start a new match, **Then** the mute state is the same as it was before the reload.

---

### Edge Cases

- **Paused at the moment of transition**: while the match is paused, clocks do not advance, so neither transition can fire. If a player pauses immediately after the visual already turned warning/danger (i.e. the transition fired in the same animation frame as the pause), the sound has already played; resume must not replay it.
- **Tab backgrounded across the transition**: when the user returns focus, the recompute on `visibilitychange` may bring the active player from "normal" straight into "exhausted" in a single step (skipping the "in-reserve" frame). In that case both sounds in the wrong order would be jarring; only the most-advanced reached state's sound plays (i.e., "exhausted").
- **Browser autoplay restrictions**: the first audio playback must occur after a user gesture (the user clicks "Iniciar partida"). Audio context unlock happens at match start so subsequent timed playbacks just work.
- **Reset mid-match**: returning to idle resets the "did we already play sound X for this player on this turn" flags so a new match starts clean.
- **Custom configuration with 1-second turn**: very short turns can cause US1 and US2 to fire within the same second. Both sounds may play (US1 then US2) but they must not overlap in a way that produces noise — US1 is short enough (≤ 250 ms) that a back-to-back firing remains acceptable.
- **Audio asset fails to load**: if the audio file is missing or the device has no audio output, the app must continue to function silently with no visible error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST play a short "entering reserve" cue exactly once per occurrence of the active player's `turnRemainingMs` transitioning from a positive value to zero while `reserveRemainingMs > 0`.
- **FR-002**: System MUST play a short, audibly distinct "exhausted" cue exactly once per occurrence of the active player's `reserveRemainingMs` transitioning from a positive value to zero, OR per occurrence of `turnRemainingMs` reaching zero in strict (reserve = 0) mode.
- **FR-003**: System MUST NOT replay either cue while the active player remains in the same derived visual state (no per-frame retrigger).
- **FR-004**: Each cue MUST be ≤ 500 ms in duration.
- **FR-005**: System MUST default the playback volume to a level appropriate for shared tournament rooms (subjectively quiet — perceived as a discreet notification, not an alarm). Concretely: the default playback volume MUST NOT exceed `0.6` on the standard `[0, 1]` HTMLAudioElement scale, AND each cue asset MUST be mastered/normalized at or below `-10 dBFS` peak level before being committed to the repository.
- **FR-006**: System MUST provide an on-screen mute toggle on the match screen, reachable on both desktop and phone layouts.
- **FR-007**: System MUST persist the mute state across page reloads via local browser storage and restore it on app load.
- **FR-008**: System MUST NOT emit any sound while the match is paused or idle.
- **FR-009**: System MUST NOT make any network request to fetch audio at runtime (assets vendored locally) so that the GitHub Pages deployment continues to work fully offline.
- **FR-010**: System MUST tolerate audio playback failure (asset missing, device muted at OS level, browser autoplay block) without throwing, breaking the timer loop, or showing visible errors.
- **FR-011**: When the user starts a match (clicks "Iniciar partida"), the app MUST unlock its audio output (by attempting to play a silent or zero-volume sample, or otherwise priming the audio subsystem) so that subsequent timed playbacks are not blocked by browser autoplay policies.
- **FR-012**: When the user resets the match, the per-player "already-played" flags MUST be cleared so that a fresh match plays the cues correctly when its transitions occur.
- **FR-013**: The cue triggered by US1 MUST be perceptually distinguishable from the cue triggered by US2 (different pitch, timbre, or pattern) so a player relying solely on hearing can tell which event occurred.

### Key Entities

- **Audio cue**: an addressable short sound (≤ 500 ms) representing one of the two transitions. Two cues exist: `enteringReserve` and `exhausted`.
- **Cue trigger flag (per player)**: a per-player, per-cue boolean tracking whether that cue has already been emitted during the current player's turn segment. Cleared when (a) the player ends their turn, (b) the match is reset, or (c) the conditions that the cue represents stop being true (i.e., the player's state goes back to a state strictly before the cue's trigger condition — although in practice clocks only ever decrease, so this is rare and only relevant after a reset).
- **Audio preference (mute)**: a boolean persisted in local browser storage; whether sound output is silenced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With a 5-second turn and 30-second reserve, the "entering reserve" sound is heard within 200 ms of the on-screen clock displaying `0:00` for the turn-clock for the first time during that turn — verifiable with a stopwatch and a visual recording.
- **SC-002**: With a 3-second turn and 5-second reserve, the "exhausted" sound is heard within 200 ms of the reserve clock first displaying `0:00` — verifiable with a stopwatch and a visual recording.
- **SC-003**: Across a 10-minute match with multiple end-turn alternations, each cue plays at most once per turn segment per player (i.e. across the match, the count of "entering reserve" cues is ≤ the number of times a player has actually entered reserve, and likewise for "exhausted").
- **SC-004**: With the mute toggle ON, no audible sound is produced for either transition across an entire match.
- **SC-005**: After toggling mute, reloading the page, and starting a fresh match, the mute toggle reflects the previous state.
- **SC-006**: A non-developer in a quiet room (~40 dB ambient) describes the cues as "noticeable but not loud" and not as "an alarm" or "loud" — captured as a one-line user-feedback note alongside US1/US2 acceptance.
- **SC-007**: The added audio assets, plus any code added for this feature, increase the total page transfer size by no more than 50 KB combined (preserves the cold-start performance budget set by the existing app).

## Assumptions

- Audio output is available on the device. If not, FR-010 ensures graceful silent operation.
- Modern browsers with HTMLAudioElement and/or Web Audio API support are targeted (the same baseline as the existing app — no IE).
- The two cues will be either short pre-recorded audio files (e.g. `.mp3` or `.ogg`) vendored in `assets/vendor/` (or a new `assets/audio/` folder), or short tones synthesized at runtime via the Web Audio API. Either choice satisfies all FRs; the implementation phase will pick one based on simplicity and the SC-007 size budget.
- Default volume is approximately half-scale (e.g. `audio.volume = 0.5`) and the cues are mastered/synthesized to be unobtrusive at that level. The mute toggle is the user-facing volume control; a continuous slider is out of scope for v1.
- The mute preference is stored in `localStorage` under a key consistent with the existing `bbtimer.config.v1` namespace (e.g. `bbtimer.audio.v1` with `{ schemaVersion: 1, muted: boolean }`), kept separate from match configuration so muting does not require re-saving the player setup.
- Background-tab playback is best-effort. Browsers may suppress audio in throttled tabs; this is acceptable per FR-010.
- Sound assets, if vendored, are committed to the repository and served from the same origin as the rest of the app — no CDN, no external requests (per FR-009).
