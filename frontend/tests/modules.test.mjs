import test from "node:test";
import assert from "node:assert/strict";
import { cumulativeModuleTarget, moduleProgressPercent, moduleTranche } from "../src/lib/modules.ts";

test("three module allocation absorbs odd-fee remainder", () => {
  assert.equal(cumulativeModuleTarget(101n, 0, 3), 33n);
  assert.equal(cumulativeModuleTarget(101n, 1, 3), 67n);
  assert.equal(cumulativeModuleTarget(101n, 2, 3), 101n);
  assert.deepEqual([0, 1, 2].map((index) => moduleTranche(101n, index, 3)), [33n, 34n, 34n]);
});

test("progress is bounded for display", () => {
  assert.equal(moduleProgressPercent(0, 3), 0);
  assert.equal(moduleProgressPercent(2, 3), 67);
  assert.equal(moduleProgressPercent(4, 3), 100);
});
