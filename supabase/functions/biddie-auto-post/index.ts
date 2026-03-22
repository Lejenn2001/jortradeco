import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";
const BIDDIE_NAME = "🤖 Biddie AI";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const uwKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "morning"; // "morning" or "alert"

    // Check if Biddie already posted today (for morning message)
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
    }

    // For alerts, check if Biddie posted in last 30 minutes to avoid spam
    if (action === "alert") {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", BIDDIE_USER_ID)
        .gte("created_at", thirtyMinsAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return new Response(JSON.stringify({ status: "too_recent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch market context
    let marketContext = "";
    if (uwKey) {
      try {
        const uwHeaders = { Authorization: `Bearer ${uwKey}`, Accept: "application/json" };
        const [tideRes, flowRes] = await Promise.all([
          fetch("https://api.unusualwhales.com/api/market/market-tide", { headers: uwHeaders }),
          fetch("https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=5", { headers: uwHeaders }),
        ]);
        const tideData = tideRes.ok ? await tideRes.json() : null;
        const flowData = flowRes.ok ? await flowRes.json() : null;
        if (tideData?.data) marketContext += `\nMarket Tide: ${JSON.stringify(tideData.data)}`;
        if (flowData?.data) marketContext += `\nTop flow alerts: ${JSON.stringify(flowData.data.slice(0, 5))}`;
      } catch (e) {
        console.warn("Failed to fetch market data:", e);
      }
    }

    let prompt = "";
    if (action === "morning") {
      const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
      prompt = `It's ${dayOfWeek} morning. Write a quick morning greeting for the JORTRADE chat room. Include a brief market outlook based on the data below. Keep it 2-3 sentences, warm and conversational. Start with something like "Good morning JORTRADE fam!" Don't use excessive slang. Be natural and helpful.${marketContext}`;
    } else if (action === "alert") {
      const alertData = body.alertData || "";
      prompt = `A major options flow just came through. Summarize this alert for the JORTRADE chat room in 1-2 sentences. Be direct and informative — mention the ticker, direction, size, and what it might signal. Keep it casual but clear.${alertData ? `\n\nAlert data: ${JSON.stringify(alertData)}` : ""}${marketContext}`;
    }

    if (!lovableKey) {
      // Fallback if no AI key
      const fallback = action === "morning"
        ? "Good morning JORTRADE fam! 🌅 Let's get it today. Check the flow and signals for early setups!"
        : "🚨 Big flow just came through — check the signals page for details!";

      await supabase.from("chat_messages").insert({
        user_id: BIDDIE_USER_ID,
        user_name: BIDDIE_NAME,
        content: fallback,
      });

      return new Response(JSON.stringify({ status: "posted_fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate message via AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are Biddie, the AI trading assistant for JORTRADE. You post in the community chat room. Be warm, conversational, and knowledgeable. Light humor is welcome but keep it natural — not over the top. Never give financial advice, frame everything as analysis.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    let messageContent: string;
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      messageContent = aiData.choices?.[0]?.message?.content || "Good morning JORTRADE fam! Let's have a great trading day! 🎯";
    } else {
      console.error("AI gateway error:", aiRes.status);
      messageContent = action === "morning"
        ? "Good morning JORTRADE fam! 🌅 Let's get after it today. Check the signals for early setups!"
        : "🚨 Big flow alert just dropped — check the signals page!";
    }

    // Post to chat
    const { error } = await supabase.from("chat_messages").insert({
      user_id: BIDDIE_USER_ID,
      user_name: BIDDIE_NAME,
      content: messageContent,
    });

    if (error) {
      console.error("Failed to insert Biddie message:", error);
      throw error;
    }

    return new Response(JSON.stringify({ status: "posted", action }), {
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
