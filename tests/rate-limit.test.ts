import assert from "node:assert/strict";
import test from "node:test";
import { rateLimit } from "../src/services/rate-limit";

test("scanner buckets do not consume one another's capacity", () => {
  const suffix = crypto.randomUUID();
  const scannerA = `scanner-a-${suffix}`;
  const scannerB = `scanner-b-${suffix}`;

  assert.equal(rateLimit(scannerA, 2).ok, true);
  assert.equal(rateLimit(scannerA, 2).ok, true);
  assert.equal(rateLimit(scannerA, 2).ok, false);
  assert.equal(rateLimit(scannerB, 2).ok, true);
});
