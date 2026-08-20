import { createClient, type User } from "@supabase/supabase-js";

export type CustomerAuthResult =
  | { ok: true; user: User; email: string; accessToken: string }
  | { ok: false; response: Response };

export async function authenticateCustomer(request: Request): Promise<CustomerAuthResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const accessToken = authorization.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return { ok: false, response: Response.json({ error: "Authentication is not configured" }, { status: 503 }) };
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) {
    return { ok: false, response: Response.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }

  return { ok: true, user: data.user, email, accessToken };
}

export function escapePostgrestLike(value: string) {
  return value.replace(/([\\%_])/g, "\\$1");
}
