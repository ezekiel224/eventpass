import assert from "node:assert/strict";
import test from "node:test";
import { visibleCheckIns } from "../src/lib/check-in-display";

test("clearing hides only records already on screen", () => {
  const beforeClear = [{ id: "scan-1" }, { id: "scan-2" }];
  const clearedIds = new Set(beforeClear.map((scan) => scan.id));
  const afterClear = [{ id: "scan-3" }, ...beforeClear];

  assert.deepEqual(visibleCheckIns(afterClear, clearedIds), [{ id: "scan-3" }]);
});
