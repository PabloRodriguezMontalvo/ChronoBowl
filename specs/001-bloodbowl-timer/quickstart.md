# Quickstart: Blood Bowl Turn Chronometer

**Feature**: 001-bloodbowl-timer  
**Audience**: developer running this project locally and validating it end-to-end.

This project has **no build step and no runtime dependencies**. Everything ships as static files.

---

## 1. Run it locally

Any static file server works. Two zero-dependency options:

### Option A — Python 3 (already installed on most systems)

```powershell
cd "specs\001-bloodbowl-timer"  # or repo root after implementation lands
python -m http.server 8080
```

Open <http://localhost:8080>.

### Option B — Node.js 20+

```powershell
npx --yes http-server . -p 8080 -c-1
```

> Don't open `index.html` directly via `file://`. `localStorage` and a few CSS features behave differently under `file://` and you will not be testing what GitHub Pages will serve.

---

## 2. Manual acceptance walkthrough

Run this on a laptop **and** on a phone (use Chrome DevTools device emulation if you don't have a phone handy). Each step maps to acceptance scenarios in [`spec.md`](spec.md).

### A. Configuration (US-2)

1. Load the page → configuration screen visible with defaults (turn = 4:00, reserve = 0:00, names "Player 1" / "Player 2").
2. Type `Alice` and `Bob` as names, set turn = `3` minutes, reserve = `2` minutes.
3. Try to enter `-1` in turn time → field is flagged, **Start Match** is disabled or rejected. ✅ FR-004.

### B. Core turn clock (US-1)

4. Click **Start Match**. One clock starts counting down (Player 1 by default), the other is frozen at `3:00`. Reserve indicators show `2:00` for both.
5. Visually verify the active card is unmistakable (bold color, larger, pulsing). ✅ FR-007 / SC-002.
6. Press `A` (or tap Player 1's card on touch). Player 1's clock freezes at its current value, Player 2's clock starts counting down from `3:00`. ✅ FR-008.
7. Press `L`. Turn flips back. Repeat a few times. ✅ FR-009.
8. Hold `A` for two seconds → turn does **not** flip multiple times. ✅ FR-019.

### C. Reserve consumption (US-3)

9. Reset, set turn = `0:10`, reserve = `0:30`. Start.
10. Don't press anything. After 10 s, the active card switches to the warning state and the reserve counter starts decreasing. ✅ FR-010.
11. End turn while in reserve → rival's per-turn timer is full (`0:10`); previous player's reserve shows the reduced value (e.g., `~0:25`). ✅ FR-011.
12. Reset, set turn = `0:05`, reserve = `0:05`. Start. Wait until both hit 0 → active card enters the exhausted (danger / shake) state, clock shows `0:00`, no further negative numbers. ✅ FR-012.

### D. Pause / resume (US-4)

13. Start a match. Press `Space`. Both clocks freeze, "PAUSED" banner appears. ✅ FR-013 / FR-014.
14. Press `A` while paused → no turn change. ✅ FR-014.
15. Press `Space` again. Same player resumes. Verify wall-clock vs displayed time: pause for ~30 s, resume; only ~0 s should have ticked off during the pause. ✅ FR-015.

### E. Mobile / touch (US-5)

16. Open the page in a phone-sized viewport (DevTools → 375×667 or smaller). Verify no horizontal scroll. ✅ FR-018.
17. Each player's card covers ~half the viewport. Tap your own half to end turn; tap the on-screen Pause button to pause/resume. ✅ FR-009 / FR-013.
18. Confirm clock digits and names are legible without pinch-zoom and that buttons are at least 44×44 CSS pixels. ✅ SC-007.

### F. Reset (US-6)

19. Mid-match, click **Reset** → confirmation dialog → confirm.
20. Both clocks restored to configured values; names and configuration preserved. Start again to verify. ✅ FR-016.

### G. Background-tab accuracy (FR-017 / SC-003)

21. Start a match with turn = `5:00`. Switch to another tab for **60 seconds**. Switch back.
22. The active player's clock should show ~`4:00` (within ±1 second), **not** something close to `5:00`. ✅ FR-017 / SC-003.

### H. Offline (FR-020 / SC-005)

23. Hard-reload (`Ctrl+Shift+R`) with DevTools Network panel open. Confirm only same-origin requests, all to `/assets/...`, complete within ~2 s on a throttled "Fast 3G/4G" profile.
24. Toggle DevTools to **Offline** and refresh once more (browser cache must serve the assets). Page still loads and a match can still be played end-to-end.

---

## 3. Run the unit-style logic tests

The pure-function clock and turn-transition logic is testable without a browser using Node 20+'s built-in test runner — **no `npm install` required**.

```powershell
node --test tests
```

Expected output: all tests passing. Tests cover at minimum:

- `recompute` correctly subtracts elapsed time across the per-turn → reserve boundary.
- `recompute` floors both timers at 0.
- `endTurn` rejects within the 150 ms debounce window.
- `endTurn` resets only the previously active player's per-turn timer, never their reserve.
- `pause` / resume preserves the remaining values exactly.

---

## 4. Deploy to GitHub Pages

1. Commit and push the feature branch, then merge to `main`.
2. In the GitHub repo: **Settings → Pages → Source = `Deploy from a branch` → Branch = `main` / `/ (root)` → Save**.
3. Wait ~1 minute. The site is live at `https://<user>.github.io/<repo>/`.
4. Open it on a phone and on a laptop, repeat the manual walkthrough §2 against the live URL.

No GitHub Actions workflow is required for v1.
