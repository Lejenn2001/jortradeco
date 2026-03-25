import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const REPLIT_API = 'https://python-script-lejenn2001.replit.app/api/whale/chat';
const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, postToChat, history } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ reply: "Send me a message and I'll check the flow!" }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Forwarding to Replit API:', message.substring(0, 80));

    const body: Record<string, unknown> = { message: message.trim() };
    if (history && Array.isArray(history) && history.length > 0) {
      body.history = history;
    }

    const res = await fetch(REPLIT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Replit API error:', res.status, errText);
      throw new Error(`Replit API failed [${res.status}]`);
    }

    const data = await res.json();
    const reply = data.analysis || data.reply || "I couldn't get a response right now. Try again in a moment.";

    // If postToChat is true, insert Biddie's reply into chat_messages using service role
    if (postToChat) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase.from('chat_messages').insert({
          user_id: BIDDIE_USER_ID,
          user_name: 'Biddie AI',
          content: reply,
        });
      } catch (dbErr) {
        console.error('Failed to post Biddie reply to chat:', dbErr);
      }
    }

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
