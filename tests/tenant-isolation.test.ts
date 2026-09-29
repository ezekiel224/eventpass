import assert from "node:assert/strict";
import test from "node:test";
import { tenantScope } from "../src/lib/tenant-scope";
import { hashOpaqueToken } from "../src/lib/session";

test("every tenant-owned resource produces a predicate containing only the requested organization", () => {
  const serialized = Object.entries(tenantScope).map(([resource, scope]) => [resource, JSON.stringify(scope("org-a"))]);
  assert.equal(serialized.length, 22);
  for (const [resource, where] of serialized) {
    assert.match(where, /org-a/, `${resource} must include the active organization`);
    assert.doesNotMatch(where, /org-b/, `${resource} must not include another organization`);
  }
});

test("tenant predicates cannot match the same direct tenant resource across organizations", () => {
  assert.notDeepEqual(tenantScope.event("org-a"), tenantScope.event("org-b"));
  assert.notDeepEqual(tenantScope.role("org-a"), tenantScope.role("org-b"));
  assert.notDeepEqual(tenantScope.membership("org-a"), tenantScope.membership("org-b"));
  assert.notDeepEqual(tenantScope.auditLog("org-a"), tenantScope.auditLog("org-b"));
  assert.notDeepEqual(tenantScope.setting("org-a"), tenantScope.setting("org-b"));
  assert.notDeepEqual(tenantScope.apiCredential("org-a"), tenantScope.apiCredential("org-b"));
  assert.notDeepEqual(tenantScope.integration("org-a"), tenantScope.integration("org-b"));
  assert.notDeepEqual(tenantScope.session("org-a"), tenantScope.session("org-b"));
});

test("public bearer tokens are stored as one-way hashes", () => {
  const token = "secret-public-pass-token";
  const digest = hashOpaqueToken(token);
  assert.notEqual(digest, token);
  assert.equal(digest.length, 64);
  assert.equal(hashOpaqueToken(token), digest);
  assert.notEqual(hashOpaqueToken(`${token}-other`), digest);
});
