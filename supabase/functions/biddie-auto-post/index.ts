import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";
const BIDDIE_NAME = "🤖 Biddie AI";
const REPLIT_API = "https://python-script-lejenn2001.replit.app/api/whale/chat";
const CHAT_BREVITY = " IMPORTANT: Keep response to 3 sentences max. Include ONE specific actionable contract recommendation with: ticker, call/put, strike price, expiration date, and your confidence level (low/medium/high/very high). Example format: 'Watching AAPL 200C 4/18 — high confidence, premium around $2.50, targeting the $205 zone.' Be concise like a quick trade alert. CRITICAL: Do NOT state exact current prices as fact — prices may be from previous close or delayed. Say 'last seen near $X' or 'closed around $X' instead of 'price is at $X' or 'pinned at $X'. Focus on the contract setup, strike, and levels — not quoting a live price.";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

async function fetchReplit(message: string): Promise<{ ok: boolean; analysis?: string }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(REPLIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, analysis: data.analysis };
      }
      console.warn(`Replit attempt ${attempt + 1} failed: ${res.status}`);
    } catch (e) {
      console.warn(`Replit attempt ${attempt + 1} error:`, e);
    }
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return { ok: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "morning";

    // === MORNING MESSAGE ===
    if (action === "morning") {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", BIDDIE_USER_ID)
        .gte("created_at", `${today}T00:00:00Z`)
        .like("content", "%morning%")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ status: "already_posted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use Replit API for morning overview (with retry)
      const result = await fetchReplit("Give me a pre-market overview and the single top setup for today based on yesterday's flow. Remember prices are from previous close, not live." + CHAT_BREVITY);
      const timeStr = new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true });
      if (result.ok && result.analysis) {
        const content = `Good morning JORTRADE fam! 🌅\n\n${result.analysis}\n\n_Data as of ${timeStr} ET — prices may reflect previous close_`;
        await supabase.from("chat_messages").insert({
          user_id: BIDDIE_USER_ID,
          user_name: BIDDIE_NAME,
          content,
        });
        return new Response(JSON.stringify({ status: "posted", action }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback
      await supabase.from("chat_messages").insert({
        user_id: BIDDIE_USER_ID,
        user_name: BIDDIE_NAME,
        content: "Good morning JORTRADE fam! 🌅 Let's get it today. Check the flow and signals for early setups!",
      });
      return new Response(JSON.stringify({ status: "posted_fallback", action }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === WHALE ALERT AUTO-POST ===
    if (action === "alert") {
      // Throttle: no more than 1 alert every 30 min
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", BIDDIE_USER_ID)
        .gte("created_at", thirtyMinsAgo)
        .like("content", "%🚨%")
        .limit(1);

      if (recent && recent.length > 0) {
        return new Response(JSON.stringify({ status: "too_recent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const alertData = body.alertData || {};
      const ticker = alertData.ticker || "Unknown";
      const alertMsg = `What's the latest whale flow on ${ticker}? Give me just the single highest conviction play.` + CHAT_BREVITY;

      const result = await fetchReplit(alertMsg);
      if (result.ok && result.analysis) {
        const content = `🚨 **Whale Alert — ${ticker}**\n\n${result.analysis}`;
        await supabase.from("chat_messages").insert({
          user_id: BIDDIE_USER_ID,
          user_name: BIDDIE_NAME,
          content,
        });
        return new Response(JSON.stringify({ status: "posted", action }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("chat_messages").insert({
        user_id: BIDDIE_USER_ID,
        user_name: BIDDIE_NAME,
        content: `🚨 Big flow alert on **${ticker}** — check the signals page for details!`,
      });
      return new Response(JSON.stringify({ status: "posted_fallback", action }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === @BIDDIE REPLY ===
    if (action === "reply") {
      const messageContent = body.message || "";
      const userName = body.user_name || "someone";

      // Don't reply to self
      if (body.user_id === BIDDIE_USER_ID) {
        return new Response(JSON.stringify({ status: "skip_self" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only reply if message contains @biddie (case-insensitive)
      const hasBiddieTag = /\b@?\s*biddie\b/i.test(messageContent);
      if (!hasBiddieTag) {
        return new Response(JSON.stringify({ status: "skip_no_tag" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Strip the @biddie tag and send the rest to Replit API
      const cleanMessage = (messageContent.replace(/@?\s*biddie\s*/i, "").trim() || "What's the market looking like right now?") + CHAT_BREVITY;

      const result = await fetchReplit(cleanMessage);
      if (result.ok && result.analysis) {
        await supabase.from("chat_messages").insert({
          user_id: BIDDIE_USER_ID,
          user_name: BIDDIE_NAME,
          content: result.analysis,
        });
        return new Response(JSON.stringify({ status: "replied" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback using Lovable AI
      if (lovableKey) {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are Biddie, the AI trading assistant for JORTRADE. Keep replies to 1-3 sentences. Be helpful and conversational." },
              { role: "user", content: `${userName} asked in the chat: "${cleanMessage}". Reply naturally.` },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const reply = aiData.choices?.[0]?.message?.content || "I'm having trouble right now, try again in a sec!";
          await supabase.from("chat_messages").insert({
            user_id: BIDDIE_USER_ID,
            user_name: BIDDIE_NAME,
            content: reply,
          });
          return new Response(JSON.stringify({ status: "replied_fallback" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ status: "reply_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "unknown_action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("biddie-auto-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
