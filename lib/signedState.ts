type SignedPayload = Record<string, unknown> & { exp: number; purpose: string };

function encode(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function signingKey() {
  const secret = process.env.CHECKOUT_SIGNING_SECRET;
  if (!secret) throw new Error("Checkout signing is not configured");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signState(
  purpose: string,
  data: Record<string, unknown>,
  ttlSeconds = 30 * 60
) {
  const payload: SignedPayload = { ...data, purpose, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(encoded));
  return `${encoded}.${encode(new Uint8Array(signature))}`;
}

export async function verifyState(token: unknown, purpose: string): Promise<SignedPayload | null> {
  if (typeof token !== "string" || token.length > 10_000) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      decode(signature),
      new TextEncoder().encode(encoded)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(encoded))) as SignedPayload;
    if (payload.purpose !== purpose || !Number.isFinite(payload.exp) || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
