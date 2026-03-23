import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: "TELEGRAM_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  try {
    const { signals, override_chat_id } = await req.json();

    if (!signals || !Array.isArray(signals) || signals.length === 0) {
      return new Response(JSON.stringify({ message: "No signals to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which chat IDs to send to
    const chatIds: string[] = [];

    if (override_chat_id) {
      // Test mode: send to specific chat ID
      chatIds.push(override_chat_id);
    } else {
      // Send to admin
      if (ADMIN_CHAT_ID) chatIds.push(ADMIN_CHAT_ID);

      // Fetch all users with Telegram alerts enabled
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const isSignal = signals.some((s: any) => s.signal_source === "auto" || !s.signal_source);
      const isWhale = signals.some((s: any) => s.signal_source === "whale");

      let query = supabase
        .from("user_alert_preferences")
        .select("telegram_chat_id")
        .eq("telegram_enabled", true)
        .not("telegram_chat_id", "is", null);

      const { data: userPrefs } = await query;

      if (userPrefs) {
        for (const pref of userPrefs) {
          if (pref.telegram_chat_id && !chatIds.includes(pref.telegram_chat_id)) {
            chatIds.push(pref.telegram_chat_id);
          }
        }
      }
    }

    if (chatIds.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const signal of signals) {
      const emoji = signal.signal_type === "bullish" ? "🟢" : "🔴";
      const direction = signal.signal_type === "bullish" ? "BULLISH" : "BEARISH";
      const putCall = signal.put_call === "call" ? "📈 Call" : "📉 Put";

      let message = `${emoji} <b>JorTrade Signal Alert</b>\n\n`;
      message += `<b>Ticker:</b> $${signal.ticker}\n`;
      message += `<b>Direction:</b> ${direction}\n`;
      message += `<b>Type:</b> ${putCall}\n`;

      if (signal.strike) message += `<b>Strike:</b> ${signal.strike}\n`;
      if (signal.expiry) message += `<b>Expiry:</b> ${signal.expiry}\n`;
      if (signal.premium) message += `<b>Premium:</b> ${signal.premium}\n`;
      if (signal.confidence) message += `<b>Confidence:</b> ${signal.confidence}/10\n`;

      if (signal.description) {
        message += `\n<i>${signal.description}</i>\n`;
      }

      message += `\n⚠️ <i>Not financial advice. Trade at your own risk.</i>`;

      // Send to each chat ID
      for (const chatId of chatIds) {
        try {
          const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "HTML",
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.error(`Telegram send failed to ${chatId} [${response.status}]:`, JSON.stringify(data));
          } else {
            sentCount++;
          }
        } catch (sendErr) {
          console.error(`Error sending to ${chatId}:`, sendErr);
        }

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} alerts to ${chatIds.length} recipient(s)`,
        sent: sentCount,
        recipients: chatIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("telegram-alert error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
