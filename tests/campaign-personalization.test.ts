import assert from "node:assert/strict";
import test from "node:test";
import { personalizeCampaignText } from "../src/lib/campaigns";

test("campaign variables include attendee and plus-one names", () => {
  const result = personalizeCampaignText(
    "Hi {{firstName}} {{lastName}} ({{name}}). Your guest is {{plusOneFirstName}} {{plusOneLastName}} ({{plusOneName}}). Welcome to {{eventName}}.",
    { firstName: "Jordan", lastName: "Lee", plusOneFirstName: "Taylor", plusOneLastName: "Morgan" },
    "Annual Celebration"
  );

  assert.equal(result, "Hi Jordan Lee (Jordan Lee). Your guest is Taylor Morgan (Taylor Morgan). Welcome to Annual Celebration.");
});

test("plus-one variables are empty when an attendee has no plus-one", () => {
  const result = personalizeCampaignText(
    "{{firstName}}|{{plusOneFirstName}}|{{plusOneLastName}}|{{plusOneName}}",
    { firstName: "Jordan", lastName: "Lee" },
    "Annual Celebration"
  );

  assert.equal(result, "Jordan|||");
});
