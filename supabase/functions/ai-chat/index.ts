import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const REPLIT_API = 'https://dc9f5714-8a88-4d03-b91b-f82647f969bd-00-22sbppmc01524.riker.replit.dev/api/whale/chat';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ reply: "Send me a message and I'll check the flow!" }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Forwarding to Replit API:', message.substring(0, 80));

    const res = await fetch(REPLIT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Replit API error:', res.status, errText);
      throw new Error(`Replit API failed [${res.status}]`);
    }

    const data = await res.json();
    const reply = data.analysis || data.reply || "I couldn't get a response right now. Try again in a moment.";

    return new Response(JSON.stringify({ reply, isAlert: data.isAlert || false }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-chat error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
