import test from "node:test";
import assert from "node:assert/strict";
import { deadlinePhase, formatCountdown, normalizeSha256, toHex } from "../src/lib/integrity.ts";

test("normalizes SHA-256 commitments without changing content", () => {
  assert.equal(normalizeSha256(" SHA256:ABCDEF "), "sha256:abcdef");
});

test("converts digest bytes to fixed-width lowercase hex", () => {
  assert.equal(toHex(Uint8Array.from([0, 15, 16, 255]).buffer), "000f10ff");
});

test("marks deadline eligibility at the exact boundary", () => {
  assert.equal(deadlinePhase(99, 100), "pending");
  assert.equal(deadlinePhase(100, 100), "due");
  assert.equal(deadlinePhase(101, 100), "due");
});

test("formats countdowns and clamps elapsed deadlines", () => {
  assert.equal(formatCountdown(0, 3661), "1h 1m 1s");
  assert.equal(formatCountdown(100, 100), "Due now");
  assert.equal(formatCountdown(101, 100), "Due now");
});

