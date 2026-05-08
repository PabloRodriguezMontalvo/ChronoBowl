# Feature Specification: Blood Bowl Turn Chronometer

**Feature Branch**: `001-bloodbowl-timer`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Sitio web simple en HTML/CSS/JS vanilla con un cronómetro tipo reloj de ajedrez para llevar el tiempo de los turnos de una partida de Blood Bowl. Configurable, con pool de tiempo extra cuando se agota el tiempo del turno, una tecla para pasar el turno al rival y otra para pausar, indicación clara del jugador activo, nombre para cada uno de los dos jugadores. Desplegable como GitHub Pages, usable en portátil y móvil."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a head-to-head Blood Bowl turn clock (Priority: P1)

Two players sit at the same table (or share a phone/laptop) before a Blood Bowl match. They open the page, type their names, optionally adjust the per-turn time, then press a single control to start. The clock for the active player counts down while the inactive player's clock is paused. When the active player ends their turn, they press one key (or tap their own side on touch devices) and the clock instantly switches to the rival, who now sees their own time counting down. The active side is unmistakable at a glance.

**Why this priority**: This is the core reason the product exists. Without a working alternating turn clock with clear visual indication of whose time is running, none of the other features deliver value.

**Independent Test**: Open the page on a laptop, enter two player names, start the match, alternate turns several times using the assigned key, and confirm that exactly one player's clock advances at any time and that the active player is visually obvious.

**Acceptance Scenarios**:

1. **Given** the match has not started, **When** the user enters two non-empty player names and starts the match, **Then** one player's clock begins counting down and the other's is held at its starting value.
2. **Given** Player A's clock is running, **When** the "end turn" control is triggered, **Then** Player A's clock freezes at the current value, Player B's clock starts counting down from B's remaining time, and the active-player indicator visibly switches sides.
3. **Given** a turn is in progress, **When** any observer glances at the screen from a normal viewing distance, **Then** they can identify the active player within 1 second based on visual cues (color, size, position, or motion) without reading the clock numbers.

---

### User Story 2 - Configure turn time and reserve time pool before the match (Priority: P1)

Before starting, the user opens a configuration area and sets: the per-turn time limit (e.g., 4 minutes), the size of the reserve time pool per player (e.g., 0–10 minutes), and the two player names. After confirming, those values are used for the entire match. Reasonable defaults are pre-filled so a user who just wants to start can do so in one click.

**Why this priority**: Blood Bowl groups use different house rules for turn timing. The product must support this variability or it is unusable for most leagues.

**Independent Test**: Change the per-turn time and reserve pool to non-default values, start a match, let one turn run out, and observe that the configured values were applied (turn timer started at the configured value; reserve pool engaged at the configured size).

**Acceptance Scenarios**:

1. **Given** the configuration screen is open, **When** the user sets per-turn time to 3 minutes and reserve pool to 2 minutes for both players and starts the match, **Then** each player's turn timer starts at 3:00 and a separate visible reserve indicator shows 2:00 for each player.
2. **Given** the configuration screen is open with default values, **When** the user starts the match without changing anything, **Then** the match starts with sensible defaults (4-minute turn, 0-minute reserve pool) and the player names default to readable placeholders if left blank.
3. **Given** the user enters an invalid value (e.g., negative or non-numeric time), **When** they attempt to start the match, **Then** the match does not start and the offending field is flagged with a clear message.

---

### User Story 3 - Consume the reserve time pool when the turn timer runs out (Priority: P1)

The active player exceeds the per-turn time limit. Instead of immediately flagging a loss, the clock automatically begins drawing from that player's reserve time pool. The player can keep playing, but the screen makes it visually obvious that they are now spending banked time (different color/state). When they eventually press "end turn", the rival's turn begins fresh with their own full per-turn time, while the previous player's reserve pool retains whatever was left. Reserve time spent is never refunded.

**Why this priority**: The reserve pool is an explicit requirement and a defining differentiator from a generic chess clock; without it the product does not satisfy the user's stated need.

**Independent Test**: Configure a short per-turn time (e.g., 10 seconds) and a small reserve (e.g., 30 seconds), let the turn timer expire without ending the turn, and observe that (a) play does not stop, (b) the reserve pool starts decreasing, (c) the visual state changes to indicate "in reserve", and (d) on next turn the per-turn timer resets fully but the reserve does not.

**Acceptance Scenarios**:

1. **Given** the active player's per-turn timer reaches zero and they have reserve time remaining, **When** time continues to elapse, **Then** the reserve pool begins counting down at the same rate and the player remains active.
2. **Given** the active player is consuming reserve time, **When** they end their turn, **Then** the rival's per-turn timer starts at the full configured value and the previous player's per-turn timer is reset to the full configured value for their next turn while their reserve retains its current (reduced) value.
3. **Given** the active player's reserve pool reaches zero while still in their turn, **When** time continues to elapse, **Then** the clock visibly enters a "time exhausted" state for that player and stops counting further negative time.

---

### User Story 4 - Pause and resume the match (Priority: P2)

Either player needs a moment (rules question, bathroom break, dice on the floor). One press of the pause control freezes whichever clock is running. A second press resumes the same clock from where it stopped. Pause state is unambiguous on screen.

**Why this priority**: Real games are interrupted constantly. Without pause, the timer is unusable in practice, but it is dependent on the core clock from US1.

**Independent Test**: Start a match, pause mid-turn, wait 30 seconds, resume, and verify that no time elapsed during the pause for either player and that the same player who was active before the pause is active again.

**Acceptance Scenarios**:

1. **Given** a player's clock is counting down, **When** the pause control is triggered, **Then** all clocks freeze and the screen displays an unambiguous paused state.
2. **Given** the match is paused, **When** the pause control is triggered again, **Then** the previously active player's clock resumes from the exact same value.
3. **Given** the match is paused, **When** the user attempts to end a turn, **Then** the turn does not change until play is resumed (or the action is rejected with a visible cue).

---

### User Story 5 - Use the timer on a phone via touch (Priority: P2)

A player opens the page on a phone with no physical keyboard. The layout adapts so that each player has a large, clearly bordered touch area covering roughly half the screen. Tapping your own area ends your turn (passing the clock to the rival). A separate, easily reachable on-screen control pauses and resumes. Names and clocks remain legible in portrait and landscape.

**Why this priority**: The user explicitly requires phone usability. Keyboard-only interaction would block this.

**Independent Test**: Open the deployed page on a phone, run a few turns using only on-screen taps (no keyboard), pause and resume, and confirm the experience matches the laptop flow without horizontal scrolling or hidden controls.

**Acceptance Scenarios**:

1. **Given** the page is loaded on a phone-sized viewport, **When** the user looks at the screen during a turn, **Then** each player's clock and name are legible without zooming and the active half is visually highlighted.
2. **Given** the page is loaded on a phone, **When** the active player taps their own half of the screen, **Then** the turn passes to the rival.
3. **Given** the page is loaded on a phone, **When** the user taps the on-screen pause control, **Then** the clocks pause; tapping it again resumes them.

---

### User Story 6 - Reset or start a new match (Priority: P3)

After a match ends (or to abort one), the user can return to the configuration screen, optionally keeping the names and timing settings, and start a fresh match with full timers and full reserves.

**Why this priority**: Quality-of-life. The product is still usable for a single match without it.

**Independent Test**: Run a partial match, trigger reset, start a new match, and verify both players' timers and reserves are restored to their configured starting values.

**Acceptance Scenarios**:

1. **Given** a match is in progress or finished, **When** the user triggers reset and confirms, **Then** both players' per-turn timers and reserve pools return to the configured starting values and the match returns to a stopped state.
2. **Given** a match has just been reset, **When** the user starts again, **Then** the previously entered names and configuration are preserved unless the user clears them.

---

### Edge Cases

- The user starts the match without entering names → fall back to default placeholders ("Player 1", "Player 2") so play is never blocked.
- The user sets reserve pool to 0 → the clock behaves like a strict per-turn timer with no overtime allowance; reaching zero on the turn timer immediately enters the "time exhausted" state.
- The active player presses the "end turn" control while their own clock is at zero with no reserve remaining → the turn still passes to the rival; the exhausted state for that player remains recorded.
- Both players' clocks somehow show zero (e.g., misconfiguration with 0 turn time and 0 reserve) → match starts in a stopped/exhausted state and no timer counts down until configuration is corrected.
- The browser tab is backgrounded or the device is locked → on return, the displayed time matches real elapsed wall-clock time for the active side; the timer must not silently undercount elapsed time because of inactive-tab throttling.
- The user reloads the page mid-match → the match state is lost (acceptable for v1; documented in Assumptions). The user is returned to the configuration screen.
- Multiple rapid presses of the "end turn" key in quick succession → only the first press in a short debounce window counts, to avoid skipping a turn accidentally.
- The user holds the assigned keyboard key down → only the initial key-down event counts; auto-repeat does not flip the turn repeatedly.
- Configuration values exceeding sane ranges (e.g., 10-hour turn, negative pool) → rejected at validation with a clear field-level message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST present a single web page that runs entirely client-side and is deployable as a static GitHub Pages site (no server, no runtime third-party dependencies required for core functionality).
- **FR-002**: The product MUST allow the user to enter and edit a display name for each of the two players before the match starts.
- **FR-003**: The product MUST allow the user to configure, before the match starts, the per-turn time limit (applied equally to both players) and the size of the reserve time pool (applied equally to both players), with sensible pre-filled defaults.
- **FR-004**: The product MUST validate configuration values, rejecting non-numeric, zero, or negative per-turn times, and rejecting negative reserve pool values, with clear field-level feedback before the match can start.
- **FR-005**: The product MUST display two clocks simultaneously, each labeled with the corresponding player's name, throughout the match.
- **FR-006**: When the match is running, exactly one player MUST be marked as "active" and only the active player's time MUST decrease.
- **FR-007**: The active player MUST be visually distinguishable from the inactive player at a glance (e.g., color, brightness, size, or border treatment) such that an observer can identify them within 1 second without reading numbers.
- **FR-008**: The product MUST provide a single "end turn" action that, when triggered by the active player, freezes their clock, resets their per-turn timer to the configured value for their next turn, and starts the rival's per-turn timer at that rival's remaining per-turn value (full on first turn).
- **FR-009**: The "end turn" action MUST be triggerable by a keyboard key on devices with a keyboard and by tapping the active player's own half of the screen on touch devices.
- **FR-010**: When the active player's per-turn timer reaches zero and reserve time remains for that player, the clock MUST automatically continue counting from the reserve pool without requiring user action, and MUST visually indicate the "in reserve" state.
- **FR-011**: Reserve time consumed by a player MUST persist across that player's subsequent turns (it is not refilled when their next turn begins); only the per-turn timer resets each turn.
- **FR-012**: When a player's reserve pool reaches zero while their turn is active, the clock MUST stop counting further for that player and MUST display a clearly distinct "time exhausted" state. The match MUST remain operable (the turn can still be ended, the other player can still play).
- **FR-013**: The product MUST provide a pause action, triggerable by a keyboard key on devices with a keyboard and by an on-screen control on touch devices, that freezes whichever clock is running.
- **FR-014**: While paused, no time MUST elapse on either clock, the paused state MUST be visually unambiguous, and the "end turn" action MUST be disabled (or no-op) until play is resumed.
- **FR-015**: Triggering the pause action again while paused MUST resume the previously active clock from its exact frozen value.
- **FR-016**: The product MUST provide a reset action that, after user confirmation, returns both per-turn timers and both reserve pools to their configured starting values and returns the match to the pre-start state, while preserving the entered names and configuration unless the user clears them.
- **FR-017**: The product MUST keep displayed time consistent with real elapsed wall-clock time for the active player even when the browser tab loses focus or the device sleeps and is later woken (within the limits of the platform); it MUST NOT undercount elapsed time as a side effect of inactive-tab throttling.
- **FR-018**: The product MUST be usable on both a typical laptop viewport and a typical phone viewport (portrait and landscape) without horizontal scrolling, with all primary controls (end turn, pause, reset) reachable.
- **FR-019**: The product MUST debounce or otherwise guard the "end turn" action so that a held key, repeated key-presses within a very short window, or an accidental double-tap do not flip the turn more than once.
- **FR-020**: The product MUST function fully offline once the page assets have loaded, since GitHub Pages is the deployment target and no backend exists.

### Key Entities *(include if feature involves data)*

- **Match**: A single Blood Bowl game session bounded by a start and a reset. Holds the configuration in effect, the current active player, the paused/running/finished state, and references to both players' clock states.
- **Player**: One of two participants in a match. Has a display name, a per-turn timer (resets each of their turns), a reserve pool (depletes monotonically across the match), and a derived state of normal / in-reserve / exhausted.
- **Configuration**: The set of parameters chosen before the match: per-turn time limit, reserve pool size, and the two player names. Persists across reset within the same browser session unless explicitly cleared.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From landing on the page with default settings, a user can start a match in 10 seconds or less (enter two names and press start).
- **SC-002**: An observer at normal viewing distance can correctly identify the active player within 1 second of glancing at the screen, in 100% of trials, both on laptop and phone viewports.
- **SC-003**: Across a simulated 30-turn match, the cumulative drift between displayed time and real wall-clock time for the active player stays within ±1 second total, including periods where the tab was backgrounded for up to 60 seconds.
- **SC-004**: 95% of "end turn" actions triggered by keyboard or tap result in a turn switch within 200 ms of the user's input, with no double-switches caused by held keys or accidental double-taps.
- **SC-005**: The page loads and becomes interactive in under 2 seconds on a typical 4G mobile connection, and operates fully without any further network requests after first load.
- **SC-006**: A first-time user, given only the page and no instructions, can correctly identify how to end a turn, how to pause, and which player is active, in under 30 seconds, in 90% of usability trials.
- **SC-007**: On phone viewports between 320 px and 480 px wide, all clock digits and player names remain legible without pinch-zoom and all interactive controls have a tap target of at least 44 × 44 CSS pixels.

## Assumptions

- The two players share a single device (one laptop or one phone) physically present at the table; networked multi-device synchronization between two phones is out of scope for v1.
- The interface is single-language for v1; UI text language follows the user's stated working language (Spanish acceptable) and runtime translation is not required.
- Default per-turn time is 4 minutes (the standard Blood Bowl turn length) and default reserve pool is 0 minutes (strict mode), giving leagues the option to add a buffer if they want.
- Match state is held only in memory for v1: a full page reload ends the match and returns to configuration. Persistence across reloads is not required.
- The "end turn" keyboard control uses two distinct keys, one assigned to each player's side, so the player can press the key on their own side of the table; the specific keys can be defaulted (e.g., left and right arrow, or A and L) and need not be user-remappable in v1.
- The pause keyboard control is a single key (e.g., Space) accessible to either player.
- Visual distinction of the active player relies on color contrast and size; no audio cues are required in v1.
- Browser support targets current evergreen versions of Chrome, Edge, Safari, and Firefox on desktop and mobile; older browsers are out of scope.
- Accessibility for v1 follows basic semantic HTML and visible focus states; full WCAG AA conformance audit is desirable but not a release blocker.
- Time accuracy relies on monotonic-timestamp arithmetic (rather than on a fixed tick interval alone) so that backgrounded-tab throttling does not undercount elapsed time; this is an implementation detail but justifies SC-003 being achievable.
