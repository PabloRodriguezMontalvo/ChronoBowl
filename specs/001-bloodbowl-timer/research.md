# Phase 0 Research: Blood Bowl Turn Chronometer

**Feature**: 001-bloodbowl-timer  
**Date**: 2026-05-08  
**Purpose**: Resolve open technical questions and lock decisions before design.

The user has constrained the stack (HTML, CSS, vanilla JavaScript, GitHub Pages, no backend, an animated and colorful CSS framework is allowed). All `NEEDS CLARIFICATION` markers from the spec are resolved here.

---

## R-001: CSS framework choice (animated + colorful, offline-capable, GitHub Pages safe)

**Decision**: **Bulma 1.x** (component/utility CSS, colorful by default, no JS) **+ Animate.css 4.x** (CSS-only animation library), both **vendored as local files** in `assets/vendor/`. No CDN at runtime.

**Rationale**:
- Bulma is pure CSS (no JS dependency), modular, has bold colors, modifiers (`is-primary`, `is-danger`, etc.), responsive helpers, and sensible defaults that match the "colorful" requirement out of the box.
- Animate.css is pure CSS keyframe animations applied via class names (`animate__animated animate__pulse`, etc.), perfect for highlighting the active player and the "in reserve" / "exhausted" states without writing custom keyframes for every state.
- Both are MIT-licensed.
- Vendoring (committing the minified CSS into the repo) satisfies FR-020 (offline after first load) and avoids the GitHub Pages CDN-availability risk.

**Alternatives considered**:
- **Tailwind CSS** — powerful but its compile step and Tailwind config conflict with the "no build, plain static site" goal. Rejected.
- **DaisyUI** — depends on Tailwind. Rejected for the same reason.
- **Pico.css** — minimalist, classless. Rejected as not matching the "colorful + animated" brief.
- **Materialize / MUI / Bootstrap** — Bootstrap is colorful but dated; Materialize ships JS. Bulma is closer to "colorful & modern". Rejected in favour of Bulma.
- **Pure CDN load (e.g., jsDelivr)** — simpler authoring but breaks offline behaviour (FR-020). Rejected.

---

## R-002: Tab-throttling-resistant timer accuracy

**Decision**: Drive all clock arithmetic from `performance.now()` deltas computed inside a `requestAnimationFrame` UI loop. Persist `turnStartedAtPerfNow` and `turnRemainingAtTurnStartMs` per player. Compute `displayedRemaining = turnRemainingAtTurnStartMs - (performance.now() - turnStartedAtPerfNow)` on every frame. Use `setInterval` only as a backup wakeup at ~250 ms.

**Rationale**:
- `setInterval` / `setTimeout` are throttled to ≥ 1 s (often longer) in background tabs across all evergreen browsers; using their callback count as the source of elapsed time would undercount and violate FR-017 and SC-003.
- `performance.now()` is a monotonic clock unaffected by wall-clock jumps and continues to advance correctly across tab visibility changes; reading it on `visibilitychange` / `focus` recomputes the correct remaining time the moment the user returns.
- `requestAnimationFrame` gives smooth (~60 fps) updates while visible and is paused while hidden, which is what we want for rendering; combined with the recompute-on-visibilitychange handler, accuracy is preserved.
- A 250 ms `setInterval` provides a safety net in environments where rAF is not firing (rare, but cheap insurance), and it triggers the same `recompute(now)` logic — so it is not a separate source of truth.

**Alternatives considered**:
- `Date.now()` — non-monotonic; system clock changes (NTP, manual edits, DST) would corrupt elapsed time. Rejected.
- Pure `setInterval(tick, 100)` decrementing a counter — fails the throttling test. Rejected.
- Web Workers running a counter — adds complexity for marginal accuracy gain over `performance.now()` recompute. Rejected for v1.

---

## R-003: Reserve-pool consumption semantics

**Decision**: Treat each player's clock as a two-tier countdown evaluated in this order on every recompute:
1. Subtract elapsed from the per-turn timer down to a floor of `0`.
2. Any leftover elapsed (turn timer underflow amount) is subtracted from the reserve pool, also floored at `0`.
3. The player's derived state for that frame is `normal` if turn timer > 0, `in_reserve` if turn timer == 0 and reserve > 0, `exhausted` if both are 0.

When the active player ends their turn:
- Their per-turn timer is **restored to the configured per-turn duration** (per FR-008 / FR-011).
- Their reserve pool is **left as is** (per FR-011 — never refilled).
- Active player flips; the rival's recorded per-turn remaining (which was full-or-frozen-from-start, since only the active player's clock was being decremented) becomes the new active timer.

**Rationale**: Matches FR-008, FR-010, FR-011, FR-012 exactly and is straightforward to implement as a pure function of (elapsed, perTurnRemaining, reserveRemaining).

**Alternatives considered**: Charging directly from reserve once turn is exceeded (skipping the per-turn floor step) — equivalent semantics but harder to reason about visually. Rejected.

---

## R-004: Input bindings (keyboard + touch)

**Decision**:
- **End-turn keys (per side)**: `A` for Player 1 (left), `L` for Player 2 (right). Listen on `keydown` with `event.repeat === false` to prevent auto-repeat (FR-019). The active player's key is the only one that flips the turn; pressing the inactive player's key is a no-op (defensive guard).
- **Pause key**: `Space`. Toggles pause/resume (FR-013, FR-015).
- **Reset**: button only (no keyboard shortcut), behind a confirmation dialog (FR-016).
- **Touch**: each player's clock card occupies its half of the screen and is the tap target for ending that player's turn. A separate on-screen Pause button is fixed at the bottom-center.
- **Debounce**: ignore end-turn events that occur < 150 ms after the previous accepted end-turn event (FR-019).

**Rationale**: `A` and `L` are the canonical "left side / right side" bindings on a QWERTY keyboard, mirroring how the two players sit. `Space` is the universal "pause" affordance.

**Alternatives considered**: Arrow keys (`←`/`→`) — also reasonable but trigger page scroll on some layouts. Rejected for v1.

---

## R-005: State management without a framework

**Decision**: A single in-memory state object plus a `render(state)` function called after every state mutation and on every animation frame. No reactivity library. State shape is documented in `data-model.md`.

**Rationale**: The state surface is tiny (a Match with two Players and a Configuration). A 100-LOC state-and-render module is simpler and faster to load than any framework.

**Alternatives considered**: Lit, Preact, Alpine.js — all add a dependency that is unjustified at this scope. Rejected.

---

## R-006: Persistence

**Decision**: Persist **configuration only** (player names, per-turn time, reserve pool size) in `localStorage` under key `bbtimer.config.v1`. Do **not** persist live match state.

**Rationale**: The spec (Assumptions) explicitly accepts that a page reload mid-match ends the match. Persisting names and configuration across reloads is a small QoL win and makes US-6 (reset/new match) frictionless without changing scope.

**Alternatives considered**: Persisting match state (active player, remaining times) — adds resume-from-reload behaviour out of scope for v1. Rejected.

---

## R-007: Deployment to GitHub Pages

**Decision**: Source files live at the repo root (`index.html`, `assets/`). Enable GitHub Pages with **Source = `main` branch, folder = `/ (root)`** in repo settings. No build step. No Jekyll processing needed but a `.nojekyll` empty file is added at the root to prevent Pages from ignoring files starting with `_` should we ever add any.

**Rationale**: Simplest possible deploy path. Every push to `main` updates the live site within ~1 minute.

**Alternatives considered**:
- GitHub Actions deploy workflow — useful only if a build step exists. Rejected for v1.
- Dedicated `gh-pages` branch — added cognitive overhead for a single-author static site. Rejected.

---

## R-008: Testing approach (no test runner overhead)

**Decision**: Two layers, both runnable from the command line in CI later if desired:
- **Unit-style logic checks**: pure-function tests for the clock-recompute function and the turn-transition reducer, written in plain JS modules under `tests/` and runnable via `node --test` (Node 20+, built-in test runner — no npm dependency needed).
- **Manual acceptance pass**: a numbered `quickstart.md` walkthrough that exercises every acceptance scenario in the spec on a real browser (laptop and phone viewports).

**Rationale**: The clock arithmetic is the only piece complex enough to merit automated tests. UI behaviour is best validated by the quickstart walkthrough since there is no DOM testing harness justified at this scope. Using `node --test` keeps zero npm dependencies.

**Alternatives considered**:
- Jest / Vitest — would require `package.json` and `node_modules`, contradicting the "no build, no deps" stance. Rejected.
- Playwright E2E — overkill for a two-button page; deferred to a possible v2.

---

## R-009: Accessibility minimum bar

**Decision**: Use semantic landmarks (`<main>`, `<section>`, `<button>`), visible focus rings (do not strip the framework's outline), `aria-live="polite"` on each player's clock display so that a screen reader announces transitions (e.g., "Player 1, in reserve"), and a `prefers-reduced-motion` media query to disable the Animate.css continuous animations on the active card.

**Rationale**: Hits the "basic semantic HTML and visible focus states" bar called out in the spec's Assumptions, and respects users who disable motion.

**Alternatives considered**: Full WCAG AA audit — out of scope for v1 per Assumptions.

---

## Summary of resolved unknowns

| Topic                          | Status   |
|--------------------------------|----------|
| CSS framework                  | Decided  |
| Time accuracy strategy         | Decided  |
| Reserve-pool semantics         | Decided  |
| Input bindings & debounce      | Decided  |
| State management approach      | Decided  |
| Persistence scope              | Decided  |
| GitHub Pages deployment shape  | Decided  |
| Testing strategy               | Decided  |
| Accessibility minimum          | Decided  |

No `NEEDS CLARIFICATION` items remain.
