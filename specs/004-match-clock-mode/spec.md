# Feature Specification: Match-clock mode (chess-style)

**Feature Branch**: `004-match-clock-mode`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Vamos a ir con dos tipos de cronómetro, cronómetro por turno (El actual) y otro formato de cronómetro por partida completa (sin reserva) de 75 minutos por jugador como standard"

## Clarifications

### Session 2026-05-08

- Q: How should the match-clock per-player budget be stored inside `bbtimer.config.v1`? → A: Add a new field `matchSeconds` (in seconds) alongside the existing `turnSeconds`/`reserveSeconds`. The latter two retain their per-turn meaning only.
- Q: What should happen when a player's match clock first reaches `0:00` in match-clock mode? → A: Halt the match. Both clocks freeze, end-turn events are suppressed, and a clear "¡Tiempo agotado!" banner is displayed. A new `match-over` phase is introduced. Reset returns to a fresh idle match.
- Q: How should each player's card render in match-clock mode where reserve is meaningless? → A: Hide the reserve display entirely; show only the match clock, vertically centered on the card.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose match-clock mode at setup (Priority: P1)

As a tournament organizer setting up a Blood Bowl game, I want to pick
between **per-turn timing** (the existing behaviour, with a per-turn
budget plus a reserve pool) and **match-clock timing** (a single budget
of 75 minutes per player that ticks down whenever it is that player's
turn — like a chess clock), so I can match the format the tournament
actually uses.

**Why this priority**: This is the entire feature. Many tournaments use
a per-match budget rather than per-turn budgets, and the current app
cannot represent that format at all. Without this user story, organizers
running such tournaments cannot use the app. P1 because the other
stories below are refinements that only make sense once the mode toggle
exists.

**Independent Test**: Open the configuration screen, see a clearly
labeled choice (radio buttons or equivalent) between "Por turno" and
"Por partida". Pick "Por partida" (the default for the new mode shows
75 minutes), click "Crear partida", click "▶ Empezar". Observe a
single timer per player counting down, no reserve pool, the active
player's clock decreasing while the inactive player's stays frozen.

**Acceptance Scenarios**:

1. **Given** a fresh visit with no saved configuration, **When** the
   user opens the configuration screen, **Then** the screen shows two
   clearly distinguishable mode options ("Por turno" and "Por partida")
   with "Por turno" selected by default to preserve the existing
   experience for returning users.
2. **Given** the user picks "Por partida", **When** the configuration
   form re-renders, **Then** the per-turn and reserve inputs are hidden
   or visibly disabled, and a single "Tiempo por jugador (minutos)"
   input appears with default value `75`.
3. **Given** the user picks "Por turno", **When** the form re-renders,
   **Then** the existing per-turn and reserve inputs are shown with
   their existing defaults (4 / 5 minutes); the match-clock input is
   hidden.
4. **Given** the user has chosen "Por partida" and entered `60`,
   **When** they click "Crear partida" and then "▶ Empezar", **Then**
   each player's match clock displays `60:00` initially and the active
   player's clock decreases by 1 second per real second of play.

---

### User Story 2 - Match-clock countdown semantics (Priority: P1)

As a player using match-clock mode, when it is my turn my clock counts
down; when I press my end-of-turn button my clock stops and the
opponent's clock starts. There is no reserve, no per-turn refill, and
no penalty when my clock would dip below zero in a single tick — once
my budget is gone the system signals I am exhausted.

**Why this priority**: Bundled with US1 as the second half of the MVP.
A mode toggle without correct match-clock countdown semantics is a
half-shipped feature.

**Independent Test**: With "Por partida" 75 min and end-turn keys
mapped, run a match: tap end-turn for player 1 several times, observe
that player 1's clock pauses at the value it had when ending, and
player 2's clock starts ticking down from its previous (or full) value.
After a few minutes, total elapsed wall time equals the sum of the two
clocks' decreases.

**Acceptance Scenarios**:

1. **Given** match-clock mode is active and player 1 is the active
   player with `75:00` displayed, **When** 30 real seconds pass without
   interaction, **Then** player 1's clock reads `74:30` and player 2's
   clock still reads `75:00`.
2. **Given** the same state, **When** the user presses player 1's
   end-turn key (`A`), **Then** player 1's clock freezes at its current
   value (no per-turn refill), and player 2 becomes active with their
   clock starting to count down from its previous value.
3. **Given** match-clock mode and player 1's clock has just hit `0:00`,
   **When** another tick passes, **Then** the match transitions to a
   `match-over` phase: both clocks freeze, the displayed clock floors
   at `0:00`, the player's card shows the exhausted visual state, the
   "exhausted" audio cue plays once for that player (per existing
   audio rules), and a "¡Tiempo agotado!" banner appears identifying
   which player ran out.
4. **Given** the match has reached `match-over`, **When** the user
   presses any end-turn key, taps a card, or presses pause, **Then**
   nothing happens (those inputs are suppressed); only Reset returns
   the app to a fresh idle match.
5. **Given** match-clock mode, when the user presses pause, both
   clocks freeze; when they resume, only the active player's clock
   resumes counting. (When the match is in the `match-over` phase,
   pause is a no-op per US2 §4.)

---

### User Story 3 - Persist mode and round-trip in storage (Priority: P2)

As a returning user, when I configured "Por partida 60 min" yesterday
I expect today's first visit to default to that same mode and value
without me having to reconfigure.

**Why this priority**: Quality-of-life. Without this story, the user
re-picks the mode on every visit. The MVP works without it because
the user can always reconfigure manually.

**Independent Test**: Configure "Por partida 60 min", reload the page,
confirm the form re-opens in match-clock mode with the value `60`
populated. Then switch to "Por turno", set 3 / 4, reload, confirm the
form re-opens in per-turn mode with `3` and `4`.

**Acceptance Scenarios**:

1. **Given** the user has saved a "Por partida" configuration with
   `90` minutes, **When** they reload the app, **Then** the form
   defaults to match-clock mode with the input prefilled at `90`.
2. **Given** the user has saved a legacy per-turn configuration (from
   a version before this feature), **When** they reload, **Then** the
   form defaults to "Por turno" with the previous values intact and
   the new mode is available but not preselected.

---

### Edge Cases

- **Mode-specific input visibility**: When the user toggles between
  modes, the inactive mode's inputs MUST be either hidden from the DOM
  or `disabled`/`aria-hidden`. Submitting MUST NOT pick up stale values
  from the inactive mode's inputs.
- **Switching modes mid-match**: A match in progress cannot have its
  mode changed. The configuration screen is only reachable via Reset
  (which already returns to idle); therefore mode changes implicitly
  require a reset. No new mid-match handling is required.
- **Strict mode in per-turn**: The `0`-reserve "strict mode" still
  works under per-turn mode and is unrelated to match-clock mode.
- **Match-clock value 0**: The match-clock input MUST reject `0` (a
  match with zero budget is meaningless); the minimum is 1 minute.
- **Match-clock upper bound**: 180 minutes (3 hours). Tournaments
  longer than that are unheard of; this also prevents fat-finger
  mistakes (e.g., typing `750` instead of `75`).
- **Timer display when ≥ 60 minutes**: The format `m:ss` becomes
  ambiguous at 75 minutes ("75:00" reads fine but "60:00" would be
  visually long). The display MUST keep the existing `m:ss` format
  with however many minute digits are needed (e.g., `75:00`, `60:00`,
  `9:30`). No `h:mm:ss` conversion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The configuration screen MUST present a two-way choice
  between "cronómetro por turno" and "cronómetro por partida" using
  controls that are reachable by keyboard and by pointer.
- **FR-002**: When "por turno" is selected, the form MUST behave
  exactly as today: per-turn input + reserve input + the same
  validation rules and error messages from feature 003.
- **FR-003**: When "por partida" is selected, the form MUST show a
  single "Tiempo por jugador (minutos)" input with default value `75`
  and accept whole minute values from 1 to 180 inclusive.
- **FR-004**: The mode choice MUST persist along with the rest of the
  configuration in the same `bbtimer.config.v1` localStorage entry,
  expressed as a `mode: "per-turn" | "per-match"` field. The
  match-clock per-player budget MUST be persisted as a new
  `matchSeconds` field (in seconds), independent of the existing
  `turnSeconds` / `reserveSeconds` fields, so that switching modes
  preserves each mode's last entered values. Loading an older config
  that has no `mode` field MUST default the mode to `per-turn`
  (FR-002); a missing `matchSeconds` field MUST default to 4500 (= 75
  min × 60).
- **FR-005**: In match-clock mode, each player MUST start with a
  budget equal to the configured "Tiempo por jugador" value, and the
  active player's clock MUST decrease at one real second per displayed
  second while the match phase is `running`.
- **FR-006**: In match-clock mode, ending a turn MUST freeze the
  ending player's clock at its current value (no refill of any kind)
  and start the other player's clock from where it last paused.
- **FR-007**: In match-clock mode, when a player's match clock reaches
  `0:00`, the display MUST floor at `0:00`, the player's card MUST
  show the exhausted visual state, the "exhausted" audio cue MUST
  play exactly once for that player (consistent with feature 002),
  and the match phase MUST transition to a new `match-over` phase. A
  visible banner reading "¡Tiempo agotado!" (with an indication of
  which player) MUST be shown while the match is in `match-over`.
- **FR-007a**: While the match phase is `match-over`, end-turn key
  presses, card taps, and pause toggles MUST be suppressed (no-ops).
  Reset MUST still work and MUST return the app to a fresh idle match.
- **FR-008**: In match-clock mode, the per-turn cue ("entered reserve")
  from feature 002 MUST NOT play, because there is no reserve pool.
- **FR-009**: Pause/resume MUST work in both modes with identical
  user-visible behaviour: both clocks freeze on pause; only the active
  clock resumes on resume.
- **FR-010**: Reset MUST return both players' clocks to the configured
  full value in both modes.
- **FR-011**: All existing keyboard and pointer end-turn bindings
  (`A`, `L`, tap on a player card) MUST continue to work in both modes.
- **FR-012**: The validator MUST surface error messages in the same
  unit the user sees (minutes), consistent with the convention from
  feature 003.
- **FR-013**: In match-clock mode, each player's card MUST hide the
  reserve display entirely (the reserve element is removed from the
  visual flow, not just shown as `0:00`), so only the single
  match-clock value is rendered, vertically centered on the card.
  In per-turn mode the reserve display continues to be shown as
  today.

### Key Entities

- **Mode**: a configuration enum, one of `per-turn` or `per-match`.
  Persisted in `bbtimer.config.v1`.
- **Match-clock budget**: a single positive integer of minutes per
  player, used only when `mode === "per-match"`. Persisted in
  `bbtimer.config.v1` as the new `matchSeconds` field (in seconds, for
  consistency with the existing `turnSeconds`/`reserveSeconds`). The
  existing `turnSeconds`/`reserveSeconds` fields retain their meaning
  only when `mode === "per-turn"` and are otherwise ignored.
- **Match (runtime)**: gains a `mode` field copied from the config at
  match-creation time. Players' `turnRemainingMs` is reused to hold
  the match clock in match-clock mode (no new field name needed) and
  `reserveRemainingMs` is fixed at `0` in that mode. The `phase`
  enumeration gains a fourth value `match-over` (alongside the
  existing `idle`, `ready`, `running`, `paused`) which is entered
  only when a match-clock player's clock first reaches `0:00`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can configure a 75-minute-per-player match in
  ≤ 15 seconds starting from the empty configuration screen.
- **SC-002**: With "Por partida 75 min" configured, after 5 minutes of
  uninterrupted play the active player's clock reads `70:00` ± 1 s.
- **SC-003**: 100% of the existing automated test suite (currently 63
  tests after feature 003) continues to pass without modification of
  any existing test's expectations. Per-turn mode behaviour is
  byte-for-byte unchanged for users who don't switch modes.
- **SC-004**: For a user upgrading from a version that predates this
  feature, the saved configuration loads cleanly with no error and
  the app starts in per-turn mode (their previous mode).
- **SC-005**: The total elapsed time displayed across both players'
  clocks in match-clock mode equals the wall-clock time elapsed since
  match start (within 1 second), regardless of how many end-turn
  events occurred.

## Assumptions

- The display format `m:ss` is preserved without conversion to
  `h:mm:ss`. A 75-minute clock is rendered as `75:00`, decreasing to
  `0:00`. The existing `formatMs` helper already does this.
- The internal time-keeping unit (`Match.players[i].turnRemainingMs`
  in milliseconds) is reused for the match clock so feature 002's
  delta-detection (`derivePlayerVisualStateDelta`) and the existing
  reducer (`recompute`) need only minimal extension. The `reserve`
  field stays at zero in match-clock mode, naturally suppressing the
  "entered reserve" cue (FR-008) without explicit mode-checks in the
  audio layer.
- The end-turn debounce (150 ms) and side-guard (only the active
  player's button counts) carry over unchanged.
- Audio cues, mute toggle, and the start/reset buttons added in
  features 002 and the recent UI changes apply equally to both modes.
- The mode selector in the form is presented as two radio buttons
  inside a single `<fieldset>` for accessibility. The exact visual
  treatment is open to design polish; the radio semantics are not.
- Persisting `mode` is additive in `bbtimer.config.v1` and does not
  change the schema version. Older clients that read the storage and
  ignore unknown fields would silently fall back to per-turn, which
  is the safe default. Bumping `schemaVersion` is out of scope.
