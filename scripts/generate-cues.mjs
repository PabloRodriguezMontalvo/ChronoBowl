// scripts/generate-cues.mjs
// One-off generator for the two royalty-free audio cues used by feature 002.
//
// Output:
//   assets/audio/enter-reserve.wav  (soft single chime, ~250 ms, peak ≤ -10 dBFS)
//   assets/audio/exhausted.wav      (two-pulse "alert", ~360 ms, peak ≤ -10 dBFS)
//
// Both files are 16-bit PCM mono at 22 050 Hz. Mathematically synthesized →
// copyright-free by construction. Run once: `node scripts/generate-cues.mjs`.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SAMPLE_RATE = 22050;
const BITS_PER_SAMPLE = 16;
const PEAK_AMPLITUDE = 0.30; // -10.5 dBFS — satisfies FR-005 (≤ -10 dBFS peak)

function adsr(t, total, { a = 0.01, d = 0.05, s = 0.7, r = 0.1 } = {}) {
  const releaseStart = total - r;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < releaseStart) return s;
  if (t < total) return s * (1 - (t - releaseStart) / r);
  return 0;
}

/** Soft single tone @ 880 Hz with a small 1320 Hz overtone — bell-like. */
function makeEnterReserve() {
  const dur = 0.25; // 250 ms — well under the 500 ms cap
  const n = Math.floor(dur * SAMPLE_RATE);
  const samples = new Float32Array(n);
  const f1 = 880;
  const f2 = 1320; // perfect fifth above
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = adsr(t, dur, { a: 0.005, d: 0.04, s: 0.5, r: 0.18 });
    const sig =
      Math.sin(2 * Math.PI * f1 * t) * 0.7 +
      Math.sin(2 * Math.PI * f2 * t) * 0.3;
    samples[i] = sig * env * PEAK_AMPLITUDE;
  }
  return samples;
}

/** Two short pulses @ 440 Hz with a slight detune — "alert" feel, distinct. */
function makeExhausted() {
  const pulseDur = 0.12;
  const gap = 0.06;
  const totalDur = pulseDur * 2 + gap; // 300 ms
  const n = Math.floor(totalDur * SAMPLE_RATE);
  const samples = new Float32Array(n);
  const f = 440;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let local = -1;
    if (t < pulseDur) local = t;
    else if (t >= pulseDur + gap && t < totalDur) local = t - pulseDur - gap;
    if (local < 0) {
      samples[i] = 0;
      continue;
    }
    const env = adsr(local, pulseDur, { a: 0.005, d: 0.03, s: 0.6, r: 0.04 });
    const sig =
      Math.sin(2 * Math.PI * f * t) * 0.7 +
      Math.sin(2 * Math.PI * (f * 1.5) * t) * 0.25 +
      Math.sin(2 * Math.PI * (f * 2.0) * t) * 0.05;
    samples[i] = sig * env * PEAK_AMPLITUDE;
  }
  return samples;
}

function encodeWav(float32) {
  const numSamples = float32.length;
  const byteRate = (SAMPLE_RATE * BITS_PER_SAMPLE) / 8;
  const blockAlign = BITS_PER_SAMPLE / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  let p = 0;
  // RIFF header
  buffer.write("RIFF", p); p += 4;
  buffer.writeUInt32LE(36 + dataSize, p); p += 4;
  buffer.write("WAVE", p); p += 4;
  // fmt chunk
  buffer.write("fmt ", p); p += 4;
  buffer.writeUInt32LE(16, p); p += 4;        // PCM chunk size
  buffer.writeUInt16LE(1, p); p += 2;         // PCM format
  buffer.writeUInt16LE(1, p); p += 2;         // mono
  buffer.writeUInt32LE(SAMPLE_RATE, p); p += 4;
  buffer.writeUInt32LE(byteRate, p); p += 4;
  buffer.writeUInt16LE(blockAlign, p); p += 2;
  buffer.writeUInt16LE(BITS_PER_SAMPLE, p); p += 2;
  // data chunk
  buffer.write("data", p); p += 4;
  buffer.writeUInt32LE(dataSize, p); p += 4;
  // samples
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    const intSample = Math.round(clamped * 32767);
    buffer.writeInt16LE(intSample, p);
    p += 2;
  }
  return buffer;
}

function peakDbfs(float32) {
  let peak = 0;
  for (const v of float32) {
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return 20 * Math.log10(peak);
}

function main() {
  const outDir = resolve("assets/audio");
  mkdirSync(outDir, { recursive: true });
  const cues = [
    { name: "enter-reserve.wav", samples: makeEnterReserve() },
    { name: "exhausted.wav", samples: makeExhausted() },
  ];
  for (const cue of cues) {
    const wav = encodeWav(cue.samples);
    const path = resolve(outDir, cue.name);
    writeFileSync(path, wav);
    console.log(
      `wrote ${path} (${wav.length} bytes, ${(cue.samples.length / SAMPLE_RATE * 1000).toFixed(0)} ms, peak ${peakDbfs(cue.samples).toFixed(1)} dBFS)`,
    );
  }
}

main();
