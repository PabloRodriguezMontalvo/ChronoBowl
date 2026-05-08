# Phase 0 Research — Turn-Transition Sound Cues

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

This document captures the design decisions taken during Phase 0 of
`/speckit.plan` for the audio-cue feature. Each section follows the
**Decision · Rationale · Alternatives considered** format.

---

## R-001 — Audio source: vendored asset files vs runtime synthesis

**Decision**: Vendor two short pre-rendered audio files in `assets/audio/`
under a permissive royalty-free license (CC0 / Public Domain), one for each
cue. Provide both `.ogg` (Vorbis) and `.mp3` versions and let the
HTMLAudioElement pick the best supported source.

**Rationale**:

- The user explicitly asked for "no copyright" / royalty-free sounds. Pinning
  exact, license-traceable assets in the repo is auditable; runtime synthesis
  is also copyright-free but harder to demonstrate licensing for in a
  third-party review.
- Two sub-500-ms files at 64 kbps mono comfortably fit under the SC-007
  ≤ 50 KB budget (typical: ~6-10 KB per file × 2 cues × 2 codecs ≈ ≤ 40 KB).
- Files are trivially swappable later: if the user dislikes the chosen tones
  they can drop in two new royalty-free files with the same names and
  licenses without touching code. This is friendlier than re-tuning Web
  Audio synthesis parameters.
- Pre-rendered audio plays identically across all browsers; Web Audio
  oscillator timing has minor differences in attack-decay envelopes between
  Safari and Chromium that complicate "perceptually identical" cues.
- Loading happens once at app start; subsequent playbacks reuse the in-memory
  decoded buffer (or the cached `<audio>` element) — no network requests
  during a match (FR-009).

**Alternatives considered**:

- **Web Audio API runtime synthesis (oscillator + gain envelope)**: zero
  asset bytes, fully copyright-free by construction, but harder to license-
  document for the user's "no copyright" guarantee, harder to tune for
  pleasantness, and adds ~30 LOC of envelope/oscillator code per cue.
  Rejected for v1; remains a viable fallback if SC-007 is at risk.
- **Single audio file containing both cues with sprite-style offsets**: marginal
  byte savings, materially harder to swap individual sounds. Rejected.
- **External CDN (e.g. Freesound.org direct link)**: violates FR-009
  (offline). Rejected outright.

---

## R-002 — Sourcing concrete royalty-free assets

**Decision**: Use audio files from one of the following sources, pinned by
exact file URL recorded in `LICENSE-AUDIO.md` at the repo root and committed
verbatim into `assets/audio/`:

1. **Pixabay Sound Effects** — Pixabay license, royalty-free, commercial use
   permitted, no attribution required.
2. **freesound.org filtered to `license:"Creative Commons 0"`** — CC0 / Public
   Domain Dedication, no attribution legally required (we still record the
   creator and source URL as a courtesy).
3. **mixkit.co Free SFX library** — Mixkit license, royalty-free, no
   attribution required.

Specific candidate files (the implementer picks one per cue):

- **Cue A — "entering reserve"**: a soft single tone or short bell, ~200-300 ms.
  Search terms: "soft bell", "notification ding", "tick", "metallic chime".
  Concrete candidate (Pixabay license, CC0-equivalent):
  `https://pixabay.com/sound-effects/notification-1-269296/` (or any equivalent
  ≤ 500 ms hit from the same library).
- **Cue B — "exhausted"**: a perceptually distinct, slightly lower or
  pattern-different tone — e.g. two short beeps, a buzz, or a "double-tick" —
  ≤ 500 ms.
  Search terms: "buzzer short", "alert short", "warning tone".
  Concrete candidate (Pixabay license):
  `https://pixabay.com/sound-effects/error-126627/` (or a similarly short
  alert tone).

**Rationale**:

- All three sources host genuinely royalty-free content with clear,
  permissive licenses. Pinning by URL + license label gives downstream
  reviewers a one-step verification path.
- We commit a `LICENSE-AUDIO.md` documenting: source URL, source name,
  license, author (where available), download date, and the file the source
  was renamed to. This satisfies the user's "no copyright" requirement with
  a traceable paper trail.
- We provide BOTH `.ogg` and `.mp3` so all evergreen browsers play natively
  (older Safari struggles with Vorbis; mobile Safari prefers MP3/AAC).

**Alternatives considered**:

- **Royalty-free music libraries (Epidemic Sound, AudioJungle)**: usually
  require attribution or paid plans. Rejected for friction.
- **AI-generated SFX (e.g. ElevenLabs free tier)**: licensing terms vary and
  can change retroactively. Rejected for risk.
- **YouTube Audio Library**: license confined to YouTube uploads; not
  appropriate for redistribution from a static site. Rejected.

> **Implementation guidance**: At task-execution time, the implementer downloads
> two small files matching the constraints above, stores them under
> `assets/audio/{enter-reserve,exhausted}.{ogg,mp3}`, and records each one's
> attribution row in `LICENSE-AUDIO.md`. If a chosen asset is longer than
> 500 ms, trim with Audacity (a one-time dev-only step; the trimmed file is
> what gets committed). No build pipeline, no transcoding step in CI.

---

## R-003 — Playback API choice (HTMLAudioElement vs Web Audio AudioBufferSourceNode)

**Decision**: Use `HTMLAudioElement` (`new Audio(src)`) per cue, preloaded
once at module load.

**Rationale**:

- Smallest API surface, fewest LOC, broadest browser support.
- Allows native `<source>` fallback between OGG and MP3 if we use a
  `<audio><source><source></audio>` element approach, OR a one-liner feature
  detect (`new Audio().canPlayType('audio/ogg; codecs="vorbis"')`) followed
  by `audio.src = …`.
- Volume control via `audio.volume = 0.5` is trivial.
- Restarting on rapid retrigger is `audio.currentTime = 0; audio.play()`.
- The two cues happen at most ~once per turn; we do not need the
  sample-accurate scheduling that Web Audio offers.

**Alternatives considered**:

- **Web Audio `AudioBufferSourceNode`**: more correct for "fire and forget"
  but `BufferSource` is single-use (must create new node each playback) and
  requires explicit AudioContext unlock on user gesture. Higher LOC for no
  perceptible benefit at our cadence.
- **Howler.js or similar library**: violates the "zero runtime dependencies"
  rule established by feature 001.

---

## R-004 — Browser autoplay policy unlock

**Decision**: At the moment the user clicks the existing **"Iniciar partida"**
button in the configuration form, call `audio.load()` on each cue and
optionally call `audio.play().then(audio.pause)` on a zero-volume primer to
unlock the audio output. Wrap in try/catch; ignore failures (FR-010).

**Rationale**:

- Modern browsers (Chrome, Safari, Firefox) require a user gesture before
  the first programmatic `audio.play()`. The "Start match" click is the
  natural moment.
- A short pre-flight `play()`/`pause()` is the standard idiom for
  guaranteeing later automated playbacks succeed without surfacing a
  rejection.
- Users who never click Start (i.e. they leave the page on the config
  screen) never hear audio anyway, so unlocking on Start is sufficient.

**Alternatives considered**:

- **Unlock on first key/pointer event after page load**: works but means we
  unlock even for users who never start a match. Marginally worse; not
  meaningful.
- **Skip explicit unlock and rely on browsers being permissive enough**:
  unsafe; iOS Safari in particular blocks programmatic playback aggressively.

---

## R-005 — Where transition detection lives

**Decision**: Add a pure helper `derivePlayerVisualStateDelta(prevMatch, nextMatch)`
to `state.js` that, given the previous and current `match` snapshots, returns
the list of state transitions that just occurred for the active player(s).
The audio side-effect lives entirely in `main.js` (or `audio.js`), which
inspects the delta after each frame's `recompute` and calls
`audio.playCue(...)` accordingly.

Concretely the helper returns `0`, `1`, or `2` of these tags:

- `"p1:enteredReserve"`, `"p1:enteredExhausted"`,
- `"p2:enteredReserve"`, `"p2:enteredExhausted"`.

**Rationale**:

- Keeps `state.js` pure (no DOM, no audio, no `localStorage` access — same
  rule as feature 001).
- Keeps the audio dispatch deterministic and unit-testable: pass two state
  snapshots, assert the returned tag set.
- Single source of truth for the trigger condition; both the in-browser
  loop and the unit tests consume the same helper.
- Already-played flags do NOT belong here (they would make this function
  stateful); they live in `audio.js` instead, gated by the same tags.

**Alternatives considered**:

- **Detect transitions inside `recompute`**: would couple the timer reducer
  to a side-effect concern and bloat `recompute`'s test surface. Rejected.
- **Compare strings of `playerVisualState(...)`each frame in `main.js`
  directly**: works but duplicates the comparison logic at every call site
  and is harder to test in isolation. Rejected.

---

## R-006 — Already-played flags & their lifecycle

**Decision**: `audio.js` owns a small `triggered` map keyed by player+cue
(four booleans). Flags are flipped to `true` on first play and cleared in
exactly three places:

1. When `endTurn` flips the active player (the new active player's flags
   are reset to `false` because their per-turn segment just started).
2. When `reset(...)` returns a fresh idle match (all four cleared).
3. When `startMatch(...)` begins (all four cleared — covers a fresh start
   from idle even if reset was not called explicitly).

Flags are NOT cleared on pause/resume.

**Rationale**:

- Matches the spec's edge case: pausing right after a transition fired must
  not replay the cue on resume.
- Matches the spec's expectation that ending a turn (which restores the
  outgoing player's `turnRemainingMs` to full) gives the incoming player a
  fresh "normal" segment — they may legitimately enter reserve during their
  next turn segment too.
- Makes the test for "no retrigger across many frames" trivial: assert the
  flag transitions to `true` on the first delta tag emission and stays
  `true` thereafter.

**Alternatives considered**:

- **Tie flags to derived state instead of explicit lifecycle hooks**: works
  but is harder to reason about (e.g. what if the user manually edits
  `match` for testing?). Explicit clears are simpler.

---

## R-007 — Mute persistence schema and storage layout

**Decision**: New `localStorage` key `bbtimer.audio.v1` with payload
`{ schemaVersion: 1, muted: boolean }`. Read on app load by a new helper
`loadAudioPrefs()` in `storage.js`; written on every mute-toggle click by
`saveAudioPrefs({muted})`.

**Rationale**:

- Keeping audio prefs in their own key means toggling mute does NOT need
  the user's player-name configuration to be valid; the two storage
  domains are independent (FR-007).
- The `schemaVersion` field is consistent with the existing
  `bbtimer.config.v1` shape so future migrations follow the same pattern.
- A two-key approach also means clearing config (the existing "Borrar
  configuración guardada" button) does NOT clear the user's mute preference,
  which the user is unlikely to want re-applied each match.

**Alternatives considered**:

- **Embed `muted` in the existing `bbtimer.config.v1` payload**: simpler
  storage I/O, but drags audio prefs through every config-validation pass
  and tangles them with player-name state. Rejected.
- **`sessionStorage`**: would lose the mute state between visits. Spec
  requires persistence (FR-007). Rejected.

---

## R-008 — Test strategy

**Decision**: Two new test files using `node --test`:

- `tests/state.visualStateDelta.test.mjs` — tests the pure `derivePlayerVisualStateDelta(prev, next)` helper across the 12 state-transition combinations (3 visual states × 3 visual states for active player, plus inactive-player no-op).
- `tests/audio.cueTrigger.test.mjs` — instantiates a fake `audio.js` with
  dependency-injected `playCue` and `prefs` adapters, then drives it through
  end-to-end transition sequences (start → enter reserve → exhausted → reset
  → restart) and asserts the play log is correct, including (a) single-shot
  per transition, (b) silenced when muted, (c) flags cleared on
  endTurn/reset/startMatch.

The actual playback path (`HTMLAudioElement.play()`) is NOT unit-tested
because real audio output cannot be observed from `node --test`. Manual
quickstart §3 covers it.

**Rationale**:

- Both tests are pure: no DOM, no real Audio API, no browser. They run in
  the existing zero-dependency `node --test` harness.
- Dependency injection for `playCue` is a 1-line refactor: `audio.js`
  exports a factory `createAudio({playCue, prefs})` (the production
  `playCue` wraps `HTMLAudioElement.play()`; the test passes a stub that
  appends to an array).

**Alternatives considered**:

- **Headless browser tests (Playwright / Puppeteer)**: introduces a heavy
  dev dependency; user has no other reason to install them. Rejected.
- **Test only the delta helper, skip cue trigger tests**: misses the
  important "single-shot" guarantee (FR-003). Rejected.

---

## R-009 — Mute toggle UX

**Decision**: A small button placed inside the existing `.match-controls`
group on the match screen, next to "⏸ Pausa" and "↺ Reiniciar". Label
toggles between **"🔊 Sonido"** (when audio is on) and **"🔇 Silencio"** (when
muted). `aria-pressed` reflects mute state for screen readers. Visible focus
ring preserved (consistent with feature 001's polish phase, T040).

**Rationale**:

- Matching the existing controls group gives consistent visual weight, no
  responsive-layout rework needed, and keeps the mobile control area
  compact.
- Emojis convey state at a glance and require no localization work.
- `aria-pressed` is the canonical ARIA pattern for a toggle button.

**Alternatives considered**:

- **A separate floating overlay button**: adds layout complexity for no
  benefit.
- **Surface mute on the configuration screen instead of the match screen**:
  worse — users want to toggle mid-match if a tournament organizer asks.
  The spec already places the toggle on the match screen (FR-006).

---

## R-010 — Accessibility & i18n

**Decision**: All cues are paired with their existing visual states (color
+ animation), so deaf or hard-of-hearing players get full information
visually as before. The mute button has an `aria-label="Silenciar
notificaciones de audio"`. The `prefers-reduced-motion` media query already
suppresses the pulsing/shaking animations in feature 001 — audio cues are
NOT also suppressed by reduced motion; they remain a useful non-visual
channel for users who specifically want less motion. The cues do not
encode information that is not also visible on screen.

**Rationale**:

- Spec mandates audio is a *cue*, not the only signal, so accessibility for
  deaf users is preserved.
- `prefers-reduced-motion` is about visual motion; suppressing audio there
  would surprise users.

**Alternatives considered**:

- **Add a separate "mute when reduced-motion is set" rule**: violates the
  Principle of Least Astonishment. Rejected.

---

## Decisions consolidated

| ID    | Decision                                                              |
| ----- | --------------------------------------------------------------------- |
| R-001 | Vendor pre-rendered OGG+MP3 cue files in `assets/audio/`              |
| R-002 | Royalty-free sources (Pixabay / freesound CC0 / mixkit), pinned in `LICENSE-AUDIO.md` |
| R-003 | Playback via `HTMLAudioElement`                                       |
| R-004 | Unlock audio on "Iniciar partida" click via primer play/pause         |
| R-005 | Pure helper `derivePlayerVisualStateDelta(prev, next)` in `state.js`  |
| R-006 | Already-played flags reset on `endTurn`, `reset`, `startMatch`        |
| R-007 | Separate `bbtimer.audio.v1` localStorage key                          |
| R-008 | Two `node --test` files; DI'd fake `playCue` for trigger tests        |
| R-009 | Toggle button in `.match-controls`, `aria-pressed` for SR users       |
| R-010 | Audio is a cue, not sole channel; `prefers-reduced-motion` does NOT mute |
