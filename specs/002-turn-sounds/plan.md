# Implementation Plan: Turn-Transition Sound Cues

**Branch**: `002-turn-sounds` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from [spec.md](spec.md)

## Summary

Add two short, royalty-free audio cues to the existing Blood Bowl Timer app:
one when the active player's per-turn timer crosses zero into the reserve pool,
and a distinct one when the reserve pool itself is exhausted. Add a mute toggle
on the match screen, persisted in `localStorage`. All audio assets MUST be
royalty-free / CC0 (or equivalent unrestricted-use licensing) and committed to
the repo so the GitHub Pages deployment remains fully offline-capable
(FR-009). No new runtime dependencies.

The transition detection is derived from existing per-frame state (`recompute`
already produces the data needed); we add a thin "audio side-effect" layer
driven by the per-frame visual-state delta so the pure reducers in `state.js`
stay free of side effects.

## Technical Context

**Language/Version**: HTML5, CSS3, ECMAScript 2022 (ES Modules), as in feature 001  
**Primary Dependencies**: None at runtime. Existing vendored Bulma 1.x and Animate.css 4.x. Web Audio API (built into all evergreen browsers) for playback. Node 20+ `node --test` for unit tests (dev only).  
**Storage**: `localStorage` only. New key `bbtimer.audio.v1` with shape `{ schemaVersion: 1, muted: boolean }`. Config namespace `bbtimer.config.v1` is untouched (FR-007 separation).  
**Testing**: Unit tests for the pure transition-detection helper using `node --test`. Audio playback itself is verified via the manual quickstart (browsers cannot easily be unit-tested for audible output without heavy mocking).  
**Target Platform**: Static GitHub Pages site. Modern desktop and mobile browsers (Chromium, Firefox, Safari, Edge — all evergreen).  
**Project Type**: Single-page static site (continues from feature 001). No build step.  
**Performance Goals**: 60 fps render loop unaffected. Audio scheduling adds < 1 ms per frame on the hot path. SC-007 budget: ≤ 50 KB total transfer added by this feature (assets + code).  
**Constraints**: 100% offline after first load (FR-009). No CDN, no external requests at runtime. Audio must fail silently (FR-010). Cues ≤ 500 ms (FR-004). Royalty-free assets only (user requirement).  
**Scale/Scope**: 2 new audio assets, ~1 new JS module (`audio.js` ~80 LOC), small additions to `main.js`, `state.js` (one helper), `render.js` (mute toggle button), `app.css` (button styling), `index.html` (button + a few lines), 1-2 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository's [`/.specify/memory/constitution.md`](../../.specify/memory/constitution.md)
contains only template placeholders (no ratified principles). There are
therefore no constitution gates to evaluate. Same status as feature 001.

## Project Structure

### Documentation (this feature)

```text
specs/002-turn-sounds/
├── plan.md                   # This file
├── spec.md                   # Feature spec
├── research.md               # Phase 0 output (/speckit.plan)
├── data-model.md             # Phase 1 output (/speckit.plan)
├── quickstart.md             # Phase 1 output (/speckit.plan)
├── contracts/
│   └── audio-contract.md     # Cue trigger contract + asset metadata
└── checklists/
    └── requirements.md       # Spec quality checklist
```

### Source Code (repository root)

```text
/  (existing)
├── index.html                       # MODIFIED: add mute toggle button
├── assets/
│   ├── css/app.css                  # MODIFIED: mute button styling
│   ├── js/
│   │   ├── main.js                  # MODIFIED: instantiate audio module, wire mute, fire cues on visual-state deltas
│   │   ├── state.js                 # MODIFIED: add `derivePlayerVisualStateDelta(prev, next)` pure helper
│   │   ├── render.js                # MODIFIED: render mute button label/icon
│   │   ├── audio.js                 # NEW: audio module — preload, playback, mute, unlock, asset failure handling
│   │   └── storage.js               # MODIFIED: add `loadAudioPrefs()` / `saveAudioPrefs(prefs)`
│   └── audio/                       # NEW: vendored royalty-free cues
│       ├── enter-reserve.ogg        # ≤ ~10 KB, ≤ 500 ms, CC0
│       ├── enter-reserve.mp3        # MP3 fallback for older Safari
│       ├── exhausted.ogg
│       └── exhausted.mp3
└── tests/
    ├── state.visualStateDelta.test.mjs   # NEW: tests for the pure delta helper
    └── audio.cueTrigger.test.mjs         # NEW: tests for the deterministic part of audio module (mute state, single-shot per transition) using a fake `playCue` injection
```

**Structure Decision**: Continue the flat single-page layout established by
feature 001. Add one new module (`audio.js`) and one new asset folder
(`assets/audio/`). Both fit cleanly under `assets/` alongside the existing
`vendor/` and `js/` directories. No reorganization of existing code.

## Complexity Tracking

> No constitution violations to justify (the constitution is unfilled). The
> only added moving parts are: (a) one new module, (b) two small audio assets,
> (c) one new `localStorage` key. Justified by direct user requirements.
