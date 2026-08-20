import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const accountRoutes = [
  "app/api/account/orders/route.ts",
  "app/api/account/orders/[id]/route.ts",
  "app/api/account/orders/[id]/files/route.ts",
  "app/api/account/orders/[id]/file/route.ts",
];
for (const path of accountRoutes) {
  const source = read(path);
  assert.match(source, /authenticateCustomer/, `${path} must validate the Supabase user token`);
  assert.doesNotMatch(source, /searchParams\.get\(["']email["']\)/, `${path} must not authorize by email query parameter`);
}

const customerAuth = read("lib/customerAuth.ts");
assert.match(customerAuth, /auth\.getUser\(accessToken\)/, "customer auth must validate the access token with Supabase Auth");

const checkout = read("app/api/checkout/route.ts");
assert.match(checkout, /verifyState\(submitted\.quoteToken, "quote"\)/, "public checkout must verify signed quote state");
assert.match(checkout, /verifyState\(body\.shippingRateToken, "shipping-rate"\)/, "checkout must verify shipping state");
assert.match(checkout, /manualPricing && !await verifyAdminToken/, "manual pricing must require admin authorization");
assert.match(checkout, /trusted\.fileHash/, "checkout must bind pricing to the sliced file digest");
assert.match(read("app/api/notify/route.ts"), /Uploaded files do not match the priced models/, "uploaded order files must match priced model digests");

assert.doesNotMatch(read("app/api/order/[id]/route.ts"), /function POST/, "browser order route must not mutate payment state");
assert.match(read("app/api/webhooks/square/route.ts"), /Webhook verification is not configured/, "Square webhook must fail closed");
assert.match(read("app/api/webhooks/shippo/route.ts"), /Webhook verification is not configured/, "Shippo webhook must fail closed");

const adminAuth = read("lib/adminAuth.ts");
const adminLogin = read("app/api/admin/login/route.ts");
assert.doesNotMatch(adminAuth + adminLogin, /dragline-admin-secret/, "admin auth must not contain the former fallback secret");

for (const path of [
  "app/api/printer/route.ts", "app/api/printer2/route.ts", "app/api/shelly/power/route.ts",
  "app/api/shelly/session/start/route.ts", "app/api/shelly/session/status/route.ts", "app/api/shelly/session/stop/route.ts",
]) {
  assert.match(read(path), /verifyAdminToken/, `${path} must require admin authorization`);
}

assert.match(read("app/api/contact/route.ts"), /verifyState\(body\.token, "contact-form"\)/, "contact submissions must validate anti-abuse state");
assert.match(read(".env.example"), /CHECKOUT_SIGNING_SECRET=your-/, "environment example must document checkout signing");

console.log("Phase 0 security regression checks passed.");
