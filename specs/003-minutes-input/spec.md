# Feature Specification: Configure timers in minutes

**Feature Branch**: `003-minutes-input`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Lets change the inputs in seconds for minutes instead"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure per-turn time in minutes (Priority: P1)

As a tournament organizer or player setting up a Blood Bowl match, I open the
configuration screen and enter the per-turn allowance and the reserve pool in
**minutes** (the unit I actually think in for tournament rules — "4 minutes per
turn, 5 minutes reserve") instead of having to mentally convert to seconds
before typing 240 / 300.

**Why this priority**: This is the entire feature. Tournament rulebooks and the
community always quote turn budgets in minutes; forcing seconds is friction
that produced typos (e.g., `40` when meaning 4 min) and slowed setup. Without
this change, every match setup carries a unit-conversion tax. P1 because it
blocks no work but improves *every* match-setup interaction.

**Independent Test**: Open the app, configure both fields with `4` and `5`,
start the match, observe the active player's turn timer reads `4:00` and the
reserve reads `5:00`. Reload the page and confirm the persisted values still
display as `4` and `5` in the form (not `240` / `300`).

**Acceptance Scenarios**:

1. **Given** a fresh visit with no saved configuration, **When** the user
   opens the config screen, **Then** the per-turn and reserve inputs show
   the defaults expressed in minutes (4 and 5 respectively) with a visible
   "minutos" / "min" unit label next to each input.
2. **Given** the user types `3` in the per-turn field and `4` in the reserve
   field, **When** they click "Crear partida", **Then** the match screen
   displays `3:00` for both timers initially.
3. **Given** the user starts a match configured at 1 minute per turn,
   **When** the user looks at the active card after 30 real seconds without
   interacting, **Then** the displayed turn timer reads `0:30`.
4. **Given** the user has saved a configuration of `2` minutes turn / `3`
   minutes reserve, **When** the user reloads the page, **Then** the form
   re-populates with `2` and `3` (not `120` / `180`).

---

### User Story 2 - Validation in the new unit (Priority: P1)

As the same user, when I enter an invalid value in minutes, the validation
message MUST refer to the same unit the input asks for, so I never have to
guess whether the bound is in seconds or minutes.

**Why this priority**: Bundled with US1 because shipping US1 with
seconds-worded error messages would be confusing and effectively half-done.

**Independent Test**: Type `0` in the per-turn field and submit; the inline
error message must mention minutes (e.g., "Mínimo 1 minuto") not seconds.
Type `0.5` (or other non-integer) and confirm the error refers to whole
minutes.

**Acceptance Scenarios**:

1. **Given** an empty per-turn field, **When** the user submits, **Then**
   the form displays an error mentioning the per-turn field and the
   minute unit.
2. **Given** the user types `0` in either timer field, **When** they
   submit, **Then** the form rejects the value with a message stating the
   minimum is 1 minute (per-turn) or 0 minutes (reserve), as appropriate.
3. **Given** the user types a non-numeric or fractional value, **When**
   they submit, **Then** the form rejects it and the message states the
   value must be a whole number of minutes.

---

### Edge Cases

- **Existing localStorage from previous versions**: A user upgrading from
  the seconds-based version has `bbtimer.config.v1` storing
  `turnSeconds: 240, reserveSeconds: 300`. The form must still show `4`
  and `5` (minute equivalents). The persisted storage schema is internal
  and may keep its current shape; only the form layer is unit-aware.
- **Reserve = 0**: The user explicitly wants strict mode (no pool). The
  reserve input must accept `0` minutes and the existing strict-mode
  semantics must keep working unchanged.
- **Decimal entry**: A user types `1.5`. The form rejects it with the
  whole-minutes error rather than silently rounding.
- **Very large value**: A user types `999`. Rejected with the upper-bound
  error message ("no puede superar 60 minutos"). The 60-minute ceiling
  covers every plausible tournament setting and prevents fat-finger
  multi-hour configurations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The configuration form MUST present the per-turn timer
  input as **minutes**, with a visible unit label adjacent to the field
  reading "min" or "minutos".
- **FR-002**: The configuration form MUST present the reserve pool input
  as **minutes**, with the same unit-label treatment as FR-001.
- **FR-003**: The form MUST accept whole-number minute values only
  (rejecting fractions, negatives, non-numeric strings, and empty values
  for the per-turn field).
- **FR-004**: The reserve input MUST accept `0` (strict mode) in addition
  to positive whole minutes.
- **FR-005**: When a configuration is submitted and accepted, the running
  match MUST display each timer's initial value equal to the entered
  number of minutes followed by `:00` (e.g., entering `4` shows `4:00`).
- **FR-006**: Validation error messages MUST refer to the unit the user
  sees in the input (minutes), not the internal representation.
- **FR-007**: The form's default values, when no saved configuration
  exists, MUST be 4 minutes (per-turn) and 5 minutes (reserve) — the
  existing tournament-typical defaults expressed in the new unit.
- **FR-008**: When a previously saved configuration is loaded, the form
  MUST populate its inputs with the **minute** equivalents of the stored
  values (e.g., a stored 240-second per-turn value displays as `4`).
- **FR-009**: When the user submits a new configuration, the saved
  representation MUST round-trip cleanly: reloading the page MUST show
  the same minute values the user entered, with no drift.

### Key Entities

- **Configuration form view-model**: a unit-aware adapter sitting between
  the DOM inputs (minutes) and the `Config` entity used by the rest of
  the app. The underlying `Config` entity and its persisted shape are
  unchanged by this feature; only the form's read/write layer changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can correctly configure a 4-min/5-min match in
  ≤ 10 seconds with no unit conversion in their head.
- **SC-002**: 0 visible occurrences of the word "segundos" or "seconds"
  in the configuration screen after the change ships.
- **SC-003**: 100% of existing automated tests continue to pass without
  modification of their expectations (the underlying state model is
  unchanged; only the form's input/output unit is changed).
- **SC-004**: For a user upgrading from the previous version, the form
  on first load post-upgrade displays minute values that match what the
  user originally configured (i.e., a 240-second saved config appears
  as `4`, not `240`).

## Assumptions

- The internal `Config` schema and the persisted `bbtimer.config.v1`
  storage shape will keep `turnSeconds` and `reserveSeconds` as their
  field names (in seconds). Changing the persisted schema is out of
  scope; the form layer performs the unit conversion at the boundary.
  This avoids touching any of the existing pure helpers and tests.
- The internal `Match` representation continues to store remaining time
  in milliseconds. The display formatting (`m:ss`) is unchanged.
- The HTML `<input type="number">` controls already in use are kept;
  only their `min`, `value`, default, and adjacent label text change.
- No accessibility regressions: the existing `<label for="…">` pattern
  is preserved; only its visible text is updated to mention minutes.
- The change is a one-shot UI/labels update; no migration code in
  `storage.js` is needed because the stored field names already imply
  seconds and the form-layer adapter reads/writes minutes transparently.
