# Quickstart — Turn-Transition Sound Cues

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

This is the manual acceptance walkthrough for the audio cue feature. Run
through it once on desktop and once on a mobile browser before declaring
the feature done. Follow the existing project's local-server instructions
in the repo [`README.md`](../../README.md) to serve the site.

## 1. Run the site locally

```powershell
python -m http.server 8080
# then open http://localhost:8080 in a fresh browser tab
```

The mute preference will write to `localStorage` under the key
`bbtimer.audio.v1`. To start clean, open DevTools → Application → Local
Storage → delete that key (and `bbtimer.config.v1` if you want a fresh
config too).

## 2. Run the unit tests

```powershell
node --test tests
```

You should see all existing 28 tests from feature 001 still passing, PLUS
the new tests added by this feature (delta helper + audio cue trigger).

## 3. Manual acceptance walkthrough

### A. "Entering reserve" cue (US1)

1. Open the page.
2. Configure: turn = `5` seconds, reserve = `30` seconds. Click **Iniciar partida**.
3. **Look away from the screen.** Wait quietly for ~6 seconds.
4. **Expected**: a single short, gentle sound when the per-turn timer reaches zero. The active card simultaneously turns warning-color.
5. Wait another 5 seconds. **Expected**: NO additional sound (FR-003 + SC-003).

### B. "Exhausted" cue (US2)

1. Click **↺ Reiniciar** → confirm. Reconfigure: turn = `3` seconds, reserve = `5` seconds. Click **Iniciar partida**.
2. **Look away.** Wait quietly for ~9 seconds.
3. **Expected**: TWO sounds, in order — the gentle "entering reserve" cue at ~3 s, then a perceptibly different "exhausted" cue at ~8 s. Both clocks read `0:00`. The card shows the danger color and shake animation.
4. Wait another 5 seconds. **Expected**: NO additional sounds.

### C. Strict mode (no reserve)

1. Reset and reconfigure: turn = `3` seconds, reserve = `0`. Click **Iniciar partida**.
2. Wait ~4 seconds.
3. **Expected**: ONE sound — the "exhausted" cue. The "entering reserve" cue does NOT play (FR-002, US2 AS3).

### D. End-turn resets the per-segment flags

1. Reset and reconfigure: turn = `5` seconds, reserve = `5` seconds. Click **Iniciar partida**.
2. Wait until you hear "entering reserve" (~5 s).
3. Press `A` to end Player 1's turn before the exhausted cue plays.
4. Wait until Player 2 has burned their turn time (~5 s after press).
5. **Expected**: the "entering reserve" cue plays again, this time for Player 2. **Hint**: it must always play "for the current active player" — but our implementation simply resets the flags on `endTurn`, so this is the natural outcome.
6. Press `L` mid-reserve. Wait again.
7. **Expected**: again the "entering reserve" cue plays for Player 1 on this new segment.

### E. Mute toggle (US3)

1. Reset, reconfigure short timers (turn = `3`, reserve = `5`), but BEFORE clicking Iniciar partida, ensure the mute toggle is OFF.
2. Click **Iniciar partida**.
3. Click the mute toggle — it shows 🔇 / "Silencio" / `aria-pressed="true"`.
4. Wait through the full sequence (~9 s). **Expected**: NO sounds.
5. Reload the page. The mute toggle on the match screen (after starting another match) should still be 🔇 (state persisted).
6. Open DevTools → Application → Local Storage. Confirm `bbtimer.audio.v1` exists with `{schemaVersion:1, muted:true}`.
7. Toggle back to 🔊. Reload. Confirm the storage now has `muted:false`.

### F. Pause does not retrigger

1. Reset, reconfigure (turn = `5`, reserve = `30`). Iniciar partida.
2. Wait until the "entering reserve" cue fires.
3. Immediately press Space (pause).
4. Wait 10 seconds.
5. Press Space again (resume).
6. **Expected**: NO replay of any cue. The reserve continues to drain but no further sound until `exhausted` is reached.

### G. Reset clears everything

1. Mid-match (after one or both cues have fired), click **↺ Reiniciar** → confirm.
2. Click **Iniciar partida** again with the same config.
3. **Expected**: the cues fire fresh on the new match.

### H. Tab background → fast-forward edge case

1. Reset, reconfigure: turn = `2` seconds, reserve = `2` seconds. Iniciar partida.
2. Switch to a different browser tab for ~10 seconds.
3. Switch back.
4. **Expected**: at most one sound on return. The "exhausted" state is shown immediately. Hearing two staccato cues back-to-back as the deltas are processed is acceptable but undesirable; either way no UI corruption.

### I. Audio failure tolerance (FR-010)

1. Mute the OS-level volume fully (or unplug headphones in a kiosk setup).
2. Run a fresh match through the full sequence.
3. **Expected**: no JS errors in the console, no broken UI. The match continues to function exactly like before the audio feature was added.

## 4. Cross-browser smoke check

Run section 3.A and 3.B in:

- Latest Chrome / Edge (Chromium engine)
- Latest Firefox
- Latest Safari (desktop) — pay close attention to autoplay unlock; cues should play because they are gated by the user's "Iniciar partida" click
- iOS Safari (if available) — same gate; sometimes requires the silent-switch on the device to be OFF

## 5. License audit

1. Open `LICENSE-AUDIO.md` at the repo root.
2. Confirm both audio assets (`enter-reserve.{ogg,mp3}` and
   `exhausted.{ogg,mp3}`) are listed with: source URL, license name,
   author (if any), download date.
3. Spot-check one source URL to confirm the license is still as recorded.
