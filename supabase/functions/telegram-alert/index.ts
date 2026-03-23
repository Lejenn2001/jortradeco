import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: "TELEGRAM_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!CHAT_ID) {
    return new Response(JSON.stringify({ error: "TELEGRAM_CHAT_ID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { signals } = await req.json();

    if (!signals || !Array.isArray(signals) || signals.length === 0) {
      return new Response(JSON.stringify({ message: "No signals to send" }), {
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

      const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TELEGRAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`Telegram send failed [${response.status}]:`, JSON.stringify(data));
      } else {
        sentCount++;
      }

      // Small delay between messages to avoid rate limits
      if (signals.length > 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount}/${signals.length} alerts`, sent: sentCount }),
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
