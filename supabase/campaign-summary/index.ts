import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PROD_ORIGIN = "https://ngc-super-app.vercel.app";
const TRACKER_URL = "https://hero88-tracker.vercel.app/view";
const ALLOWED_ORIGINS = new Set([PROD_ORIGIN]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_NAMES: Record<string, string> = {
  "Chong Chian Aik": "Desmond",
  "Ng Kian Seng": "Alen Ng",
  "Kong Yen Ting": "Ivy Kong",
  "Tey Kay Giap": "Keith Tey",
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : PROD_ORIGIN,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previousCompletedWeek() {
  const malaysiaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  malaysiaNow.setHours(12, 0, 0, 0);
  const mondayOffset = (malaysiaNow.getDay() + 6) % 7;
  const currentMonday = new Date(malaysiaNow);
  currentMonday.setDate(currentMonday.getDate() - mondayOffset);
  const start = new Date(currentMonday);
  start.setDate(start.getDate() - 7);
  const end = new Date(currentMonday);
  end.setDate(end.getDate() - 1);
  return { start: isoDate(start), end: isoDate(end) };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const defaults = previousCompletedWeek();
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start") || defaults.start;
    const endDate = url.searchParams.get("end") || defaults.end;
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || startDate > endDate) {
      return json({ error: "Invalid date range" }, 400, origin);
    }

    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 62) return json({ error: "Date range is too large" }, 400, origin);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("hero88_cases")
      .select("id,name,amount,date")
      .lte("date", endDate)
      .order("date", { ascending: true })
      .limit(2000);
    if (error) throw error;

    let previousTotal = 0;
    let newAmount = 0;
    let newCases = 0;
    const movement = new Map<string, { sourceName: string; displayName: string; amount: number; cases: number }>();
    for (const row of data || []) {
      const amount = Number(row.amount) || 0;
      if (row.date < startDate) {
        previousTotal += amount;
        continue;
      }
      newAmount += amount;
      newCases += 1;
      const current = movement.get(row.name) || {
        sourceName: row.name,
        displayName: DISPLAY_NAMES[row.name] || row.name,
        amount: 0,
        cases: 0,
      };
      current.amount += amount;
      current.cases += 1;
      movement.set(row.name, current);
    }

    const movements = Array.from(movement.values())
      .map(item => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
    const currentTotal = previousTotal + newAmount;

    return json({
      campaignKey: "hero88",
      campaignTitle: "HERO 88 PROJECT",
      startDate,
      endDate,
      previousTotal: Math.round(previousTotal * 100) / 100,
      currentTotal: Math.round(currentTotal * 100) / 100,
      newAmount: Math.round(newAmount * 100) / 100,
      newCases,
      totalCases: (data || []).length,
      movements,
      targetUrl: TRACKER_URL,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error(error);
    return json({ error: "Campaign summary is unavailable" }, 500, origin);
  }
});
