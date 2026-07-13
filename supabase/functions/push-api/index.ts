import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PROD_ORIGIN = "https://ngc-super-app.vercel.app";
const ALLOWED_ORIGINS = new Set([PROD_ORIGIN]);
const MAX_TITLE = 80;
const MAX_BODY = 220;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : PROD_ORIGIN,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  if (!keys.default) throw new Error("Supabase server key is unavailable");
  return keys.default;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validSubscription(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const subscription = value as Record<string, unknown>;
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048) return false;
  try {
    if (new URL(subscription.endpoint).protocol !== "https:") return false;
  } catch {
    return false;
  }
  const keys = subscription.keys as Record<string, unknown> | undefined;
  return Boolean(keys && typeof keys.p256dh === "string" && typeof keys.auth === "string" && keys.p256dh.length < 256 && keys.auth.length < 128);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: settings, error: settingsError } = await supabase
      .from("push_settings")
      .select("vapid_public_key,vapid_private_key,admin_token_hash")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) throw settingsError || new Error("Push settings are missing");

    if (req.method === "GET") {
      return json({ enabled: true, vapidPublicKey: settings.vapid_public_key }, 200, origin);
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
    const body = await req.json();
    const action = body?.action;

    if (action === "subscribe") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
      if (!validSubscription(body.subscription)) return json({ error: "Invalid push subscription" }, 400, origin);
      const endpoint = body.subscription.endpoint as string;
      const { error } = await supabase.from("push_subscriptions").upsert({
        endpoint,
        subscription: body.subscription,
        user_agent: cleanText(req.headers.get("user-agent"), 500),
        enabled: true,
        failure_count: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      return json({ subscribed: true }, 200, origin);
    }

    if (action === "unsubscribe") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
      const endpoint = cleanText(body.endpoint, 2048);
      if (!endpoint) return json({ error: "Endpoint is required" }, 400, origin);
      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
      return json({ subscribed: false }, 200, origin);
    }

    if (action === "send") {
      const adminToken = cleanText(body.adminToken, 200);
      if (!adminToken || await sha256(adminToken) !== settings.admin_token_hash) {
        return json({ error: "Unauthorized" }, 401, origin);
      }

      const title = cleanText(body.title, MAX_TITLE) || "NGC Super App";
      const message = cleanText(body.body, MAX_BODY);
      let targetUrl = cleanText(body.url, 500) || PROD_ORIGIN;
      try {
        const url = new URL(targetUrl, PROD_ORIGIN);
        if (url.origin !== PROD_ORIGIN) targetUrl = PROD_ORIGIN;
        else targetUrl = url.href;
      } catch {
        targetUrl = PROD_ORIGIN;
      }

      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint,subscription")
        .eq("enabled", true)
        .limit(1000);
      if (error) throw error;

      webpush.setVapidDetails(PROD_ORIGIN, settings.vapid_public_key, settings.vapid_private_key);
      const payload = JSON.stringify({ title, body: message, url: targetUrl });
      let sent = 0;
      let removed = 0;
      let failed = 0;

      for (const row of subscriptions || []) {
        try {
          await webpush.sendNotification(row.subscription, payload, { TTL: 86400, urgency: "normal" });
          sent += 1;
          await supabase.from("push_subscriptions").update({
            last_success_at: new Date().toISOString(),
            failure_count: 0,
            updated_at: new Date().toISOString(),
          }).eq("endpoint", row.endpoint);
        } catch (pushError) {
          const statusCode = Number((pushError as { statusCode?: number }).statusCode || 0);
          if (statusCode === 404 || statusCode === 410) {
            removed += 1;
            await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          } else {
            failed += 1;
            await supabase.rpc("increment_push_failure", { target_endpoint: row.endpoint });
          }
        }
      }

      return json({ sent, removed, failed, total: (subscriptions || []).length }, 200, origin);
    }

    return json({ error: "Unknown action" }, 400, origin);
  } catch (error) {
    console.error(error);
    return json({ error: "Push service unavailable" }, 500, origin);
  }
});
