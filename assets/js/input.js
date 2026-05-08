/**
 * input.js — keyboard + pointer event bindings.
 * All filtering (active-side, paused, debounce) lives in state.js.
 * This module just translates DOM events into intent calls.
 */

export function installInput({ onEndTurn, onPause }) {
  // Keyboard
  document.addEventListener("keydown", (event) => {
    if (event.repeat) return; // FR-019: ignore auto-repeat
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return; // don't hijack typing in form fields
    }
    const key = event.key.toLowerCase();
    if (key === "a") {
      onEndTurn(0);
    } else if (key === "l") {
      onEndTurn(1);
    } else if (event.code === "Space" || event.key === " ") {
      event.preventDefault(); // suppress page scroll
      onPause();
    }
  });

  // Touch / pointer on each card
  const card1 = document.getElementById("player-1-card");
  const card2 = document.getElementById("player-2-card");
  if (card1) {
    card1.addEventListener("pointerup", (event) => {
      event.preventDefault();
      onEndTurn(0);
    });
  }
  if (card2) {
    card2.addEventListener("pointerup", (event) => {
      event.preventDefault();
      onEndTurn(1);
    });
  }
}
