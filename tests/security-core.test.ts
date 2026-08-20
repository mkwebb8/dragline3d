import test from "node:test";
import assert from "node:assert/strict";
import { signState, verifyState } from "../lib/signedState.ts";
import { verifyAdminToken } from "../lib/adminAuth.ts";

async function adminToken(secret: string, ts = Date.now()) {
  const payload = JSON.stringify({ ts, role: "admin" });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${btoa(payload)}.${encodedSignature}`;
}

test("signed commercial state verifies and rejects tampering", async () => {
  process.env.CHECKOUT_SIGNING_SECRET = "unit-test-checkout-secret";
  const token = await signState("quote", { price: 12.34, qty: 1 }, 60);
  assert.equal((await verifyState(token, "quote"))?.price, 12.34);
  assert.equal(await verifyState(`${token.slice(0, -1)}x`, "quote"), null);
  assert.equal(await verifyState(token, "shipping-rate"), null);
});
test("expired signed state is rejected", async () => {
  process.env.CHECKOUT_SIGNING_SECRET = "unit-test-checkout-secret";
  const token = await signState("quote", { price: 1 }, -1);
  assert.equal(await verifyState(token, "quote"), null);
});

test("admin verification fails closed without ADMIN_SECRET", async () => {
  delete process.env.ADMIN_SECRET;
  const request = new Request("https://example.test", { headers: { Authorization: "Bearer anything" } });
  assert.equal(await verifyAdminToken(request), false);
});

test("admin verification accepts a valid token and rejects invalid or expired tokens", async () => {
  process.env.ADMIN_SECRET = "unit-test-admin-secret";
  const valid = await adminToken(process.env.ADMIN_SECRET);
  assert.equal(await verifyAdminToken(new Request("https://example.test", { headers: { Authorization: `Bearer ${valid}` } })), true);
  assert.equal(await verifyAdminToken(new Request("https://example.test", { headers: { Authorization: "Bearer invalid" } })), false);
  const expired = await adminToken(process.env.ADMIN_SECRET, Date.now() - 31 * 24 * 60 * 60 * 1000);
  assert.equal(await verifyAdminToken(new Request("https://example.test", { headers: { Authorization: `Bearer ${expired}` } })), false);
});
