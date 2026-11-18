import assert from "node:assert/strict";
import test from "node:test";
import { pickUniformWinner, pickWeightedWinner } from "../src/lib/raffle-draw";

test("guest draws give every eligible guest one equal slot", () => {
  const guests = [
    { id: "first", raffleTickets: 0 },
    { id: "second", raffleTickets: 200 },
    { id: "third", raffleTickets: 1 }
  ];

  assert.equal(pickUniformWinner(guests, () => 0)?.id, "first");
  assert.equal(pickUniformWinner(guests, () => 0.34)?.id, "second");
  assert.equal(pickUniformWinner(guests, () => 0.99)?.id, "third");
});

test("ticket draws remain weighted by ticket count", () => {
  const entries = [
    { id: "one", ticketCount: 1 },
    { id: "three", ticketCount: 3 }
  ];

  assert.equal(pickWeightedWinner(entries, () => 0)?.id, "one");
  assert.equal(pickWeightedWinner(entries, () => 0.26)?.id, "three");
  assert.equal(pickWeightedWinner([], () => 0), null);
});
