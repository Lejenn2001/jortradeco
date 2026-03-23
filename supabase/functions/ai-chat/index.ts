import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Extract ticker symbols from user message (e.g. "AAPL", "SPY", "$TSLA")
function extractTickers(message: string): string[] {
  const patterns = [
    /\$([A-Z]{1,5})\b/g,           // $AAPL style
    /\b([A-Z]{2,5})\b/g,            // plain AAPL style (2-5 uppercase letters)
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      found.add(match[1]);
    }
  }
  // Filter out common non-ticker words
  const excludeWords = new Set([
    'AI', 'THE', 'FOR', 'AND', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD',
    'CAN', 'DID', 'GET', 'GOT', 'HIS', 'HER', 'HOW', 'ITS', 'LET', 'MAY',
    'NEW', 'NOW', 'OLD', 'OUR', 'OUT', 'OWN', 'SAY', 'SHE', 'TOO', 'USE',
    'WAY', 'WHO', 'BOY', 'DAY', 'EYE', 'FAR', 'FEW', 'RUN', 'SAT', 'SET',
    'TOP', 'TRY', 'TWO', 'WAR', 'YES', 'YET', 'YOU', 'ANY', 'ASK', 'BIG',
    'END', 'MAN', 'PUT', 'RAN', 'RED', 'CALL', 'CALLS', 'PUTS', 'BUY',
    'SELL', 'LONG', 'SHORT', 'PLAY', 'WHAT', 'WHEN', 'WHERE', 'WHICH',
    'WITH', 'WILL', 'WOULD', 'THAT', 'THIS', 'THEM', 'THEN', 'THAN',
    'BEEN', 'HAVE', 'EACH', 'MAKE', 'LIKE', 'JUST', 'OVER', 'SUCH',
    'TAKE', 'YEAR', 'ALSO', 'BACK', 'COME', 'COULD', 'GOOD', 'GIVE',
    'MOST', 'VERY', 'SOME', 'TIME', 'LOOK', 'ONLY', 'WANT', 'TELL',
    'SHOW', 'THINK', 'ABOUT', 'AFTER', 'AGAIN', 'HELP', 'SHOULD',
    'STRIKE', 'ENTRY', 'EXIT', 'STOP', 'LOSS', 'GAIN', 'HOLD',
    'FLOW', 'DARK', 'POOL', 'WHALES', 'DATA', 'PRICE', 'TRADE',
    'HEY', 'BIDDIE', 'JORTRADE', 'HELLO', 'THANKS',
  ]);
  return Array.from(found).filter(t => !excludeWords.has(t) && t.length >= 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uwKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');

  try {
    const { message, history, userName } = await req.json();

    // Extract tickers from user message to fetch specific data
    const tickers = extractTickers(message || '');
    console.log('Detected tickers:', tickers);

    // Detect if user is asking for stocks by price range (e.g. "under $10", "below 5", "cheap stocks")
    const priceRangeMatch = (message || '').match(/(?:under|below|less than|cheaper than|beneath)\s*\$?(\d+)/i);
    const isCheapStockQuery = /\b(cheap|penny|low.?price|small.?cap|under.?\$?\d)/i.test(message || '');

    // Fetch fresh market context
    let marketContext = '';
    if (uwKey) {
      const uwHeaders = { 'Authorization': `Bearer ${uwKey}`, 'Accept': 'application/json' };

      try {
        // Always fetch general market data
        const generalFetches: Promise<Response>[] = [
          fetch('https://api.unusualwhales.com/api/market/market-tide', { headers: uwHeaders }),
          fetch('https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=5', { headers: uwHeaders }),
        ];

        // If user asks for stocks under a price, use the screener
        if (priceRangeMatch || isCheapStockQuery) {
          const maxPrice = priceRangeMatch ? priceRangeMatch[1] : '10';
          generalFetches.push(
            fetch(`https://api.unusualwhales.com/api/screener/option-contracts?max_underlying_price=${maxPrice}&min_premium=10000&limit=15`, { headers: uwHeaders })
          );
        }

        // Fetch ticker-specific data for each detected ticker
        const tickerFetches: Promise<{ ticker: string; type: string; data: any }>[] = [];
        for (const ticker of tickers.slice(0, 3)) {
          tickerFetches.push(
            fetch(`https://api.unusualwhales.com/api/stock/${ticker}/flow-recent`, { headers: uwHeaders })
              .then(async r => ({ ticker, type: 'flow', data: r.ok ? await r.json() : null }))
              .catch(() => ({ ticker, type: 'flow', data: null }))
          );
          tickerFetches.push(
            fetch(`https://api.unusualwhales.com/api/stock/${ticker}/option-contracts`, { headers: uwHeaders })
              .then(async r => ({ ticker, type: 'contracts', data: r.ok ? await r.json() : null }))
              .catch(() => ({ ticker, type: 'contracts', data: null }))
          );
          tickerFetches.push(
            fetch(`https://api.unusualwhales.com/api/stock/${ticker}/options-volume`, { headers: uwHeaders })
              .then(async r => ({ ticker, type: 'volume', data: r.ok ? await r.json() : null }))
              .catch(() => ({ ticker, type: 'volume', data: null }))
          );
        }

        const generalResults = await Promise.all(generalFetches);
        const tickerResults = await Promise.all(tickerFetches);

        const tideData = generalResults[0].ok ? await generalResults[0].json() : null;
        const flowData = generalResults[1].ok ? await generalResults[1].json() : null;

        if (tideData?.data) {
          marketContext += `\n\n=== LIVE MARKET TIDE DATA (current) ===\n${JSON.stringify(tideData.data, null, 2)}`;
        }
        if (flowData?.data) {
          marketContext += `\n\n=== LIVE FLOW ALERTS (current) ===\n${JSON.stringify(flowData.data.slice(0, 5), null, 2)}`;
        }

        // Add screener results if we fetched them
        if (generalResults.length > 2) {
          const screenerData = generalResults[2].ok ? await generalResults[2].json() : null;
          if (screenerData?.data) {
            marketContext += `\n\n=== SCREENER RESULTS: STOCKS WITH OPTIONS FLOW (matching user price filter) ===\n${JSON.stringify(screenerData.data.slice(0, 15), null, 2)}`;
          }
        }

        // Add ticker-specific data
        for (const result of tickerResults) {
          if (result.data?.data) {
            marketContext += `\n\n=== LIVE ${result.ticker} ${result.type.toUpperCase()} DATA (current) ===\n${JSON.stringify(result.data.data, null, 2)}`;
          }
        }

        if (tickers.length > 0 && tickerResults.every(r => !r.data?.data)) {
          marketContext += `\n\n⚠️ WARNING: No live data found for tickers: ${tickers.join(', ')}. The Unusual Whales API returned no data for these tickers right now.`;
        }

      } catch (e) {
        console.warn('Failed to fetch market context:', e);
        marketContext += '\n\n⚠️ WARNING: Failed to fetch live market data. DO NOT provide any prices or trade setups.';
      }
    } else {
      marketContext += '\n\n⚠️ WARNING: No Unusual Whales API key configured. You have NO market data. DO NOT provide any prices or trade setups.';
    }

    const displayName = userName || 'Trader';
    const systemPrompt = `You are Biddie, the AI trading assistant for JORTRADE. You analyze market data and provide structured trading insights.

The user's name is ${displayName}.

PERSONALITY & TONE:
- You're a sharp, friendly trading buddy. Conversational and natural, not corporate, not over-the-top.
- Keep it casual but professional-ish. Think "cool coworker who trades" not "teenager on TikTok."
- Light humor is great. A well-placed "sheesh" or "no lie" is fine, but don't stack slang in every sentence. One casual phrase per response max.
- Add quick market color naturally, like "yeah MSFT has been struggling lately" or "NVDA's been running hot."
- Only greet with the user's name on the FIRST message of a conversation. After that, just talk naturally.
- If someone says thanks, respond warmly, "Anytime!", "You got it!", "Go get that bread 🍞", "Happy to help!", keep it natural.
- Never sound robotic or stiff. You're knowledgeable AND approachable.

FORMATTING RULES:
- NEVER use dashes or hyphens to separate ideas. Use commas instead.
- Do not use bullet points with dashes. If you need to list things, use numbers or just write naturally.

CRITICAL DATA RULES (FOLLOW STRICTLY, NO EXCEPTIONS):
1. You may ONLY reference prices, premiums, strikes, volumes, and flow data that appear in the LIVE DATA sections below.
2. If the LIVE DATA sections do NOT contain data for a ticker the user asked about, say: "I don't have live data on [ticker] right now. Let me check again later or try a different ticker."
3. NEVER guess, estimate, approximate, or use "general knowledge" for any price, strike, premium, or entry level. Every number you cite MUST come from the live data below.
4. NEVER say "based on recent trends" or "typically trades around" — if the number isn't in the live data, don't say it.
5. If the live data is missing or the API failed, tell the user honestly: "My data feed isn't returning info on that right now."
6. When giving a trade setup, every single number (strike, entry, premium, target) MUST be directly from the Unusual Whales data provided below. If you can't find the exact data, don't make up a setup.

RESPONSE RULES:
1. Keep responses SHORT. 3 to 5 sentences max unless the user asks for detail.
2. When a user asks what contract to buy or what play to make on ANY ticker, respond in this exact format (ONLY if you have live data):
   Direction (Calls or Puts)
   Strike price (FROM LIVE DATA ONLY)
   Expiration (FROM LIVE DATA ONLY)
   Entry zone (FROM LIVE DATA ONLY)
   Invalidation level (where the play is dead)
   One sentence on why (referencing actual flow/volume data)
3. Do NOT default to SPX. Answer about whatever ticker the user asks about.
4. When users ask for stocks under a certain price, cheap stocks, or penny stocks, use the SCREENER RESULTS data to find tickers with unusual options activity at those price levels. Present 3 to 5 interesting tickers with their flow details.
4. Never give financial advice, frame as analysis ("I'd look at..." or "The flow suggests...").
5. Reference specific data when available: premium, flow direction, volume — but ONLY from the live data.
6. No long paragraphs. Use numbered lists for multi-part answers.
7. ALWAYS end trade setup responses with a disclaimer on its own line: "⚠️ Not financial advice, always manage your own risk."
8. If no live data is available, DO NOT attempt to give a trade setup. Instead, let the user know.

LIVE MARKET DATA (all data below is current and from Unusual Whales API):${marketContext}`;

    // Deduplicate: if history already contains the current message as last entry, don't add again
    const chatHistory = (history || []).map((h: any) => ({
      role: h.role,
      content: h.content,
    }));
    
    const lastHistoryMsg = chatHistory[chatHistory.length - 1];
    const isDuplicate = lastHistoryMsg?.role === 'user' && lastHistoryMsg?.content === message;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      ...(!isDuplicate ? [{ role: 'user', content: message }] : []),
    ];

    console.log('Sending to AI gateway, message count:', messages.length, 'tickers:', tickers);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      throw new Error(`AI gateway failed [${aiRes.status}]: ${errText}`);
    }

    const aiData = await aiRes.json();
    console.log('AI response keys:', JSON.stringify(Object.keys(aiData)));
    const reply = aiData.choices?.[0]?.message?.content || aiData.choices?.[0]?.text || 'Sorry, I couldn\'t generate a response. Try again!';

    return new Response(JSON.stringify({ reply }), {
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
