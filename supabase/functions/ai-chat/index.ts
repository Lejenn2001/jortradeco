import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Extract ticker symbols from user message (e.g. "AAPL", "SPY", "$TSLA", "msft")
function extractTickers(message: string): string[] {
  const upper = message.toUpperCase();
  const patterns = [
    /\$([A-Z]{1,5})\b/g,           // $AAPL style
    /\b([A-Z]{2,5})\b/g,            // plain AAPL style (2-5 uppercase letters)
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(upper)) !== null) {
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
    'HEY', 'BIDDIE', 'JORTRADE', 'HELLO', 'THANKS', 'CURRENT',
    'GIVE', 'STOCKS', 'UNDER', 'HIGH', 'VOLUME', 'OPTION', 'OPTIONS',
    'BASED', 'UPON', 'INFO', 'PROVIDED', 'CONSIDER', 'RIGHT',
    'MUCH', 'DOES', 'COST', 'WHAT', 'RECOMMENDING',
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
            fetch(`https://api.unusualwhales.com/api/screener/option-contracts?max_stock_price=${maxPrice}&min_premium=5000&limit=15`, { headers: uwHeaders })
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
- Only greet with the user's name on the FIRST message of a conversation. After that, just talk naturally.
- If someone says thanks, respond warmly, "Anytime!", "You got it!", "Go get that bread 🍞", "Happy to help!", keep it natural.
- Never sound robotic or stiff. You're knowledgeable AND approachable.

FORMATTING RULES:
- NEVER use dashes or hyphens to separate ideas. Use commas instead.
- Do not use bullet points with dashes. If you need to list things, use numbers or just write naturally.

ABSOLUTE DATA SOURCE RULE (THIS OVERRIDES EVERYTHING):
Your ONLY source of market information is the LIVE DATA sections at the bottom of this prompt. This data comes from the Unusual Whales API.
- You have ZERO market knowledge of your own. You are NOT a market expert. You are a data reader.
- Every single piece of data you mention (prices, strikes, expirations, premiums, volumes, tickers, sentiment, direction, flow) MUST come from the LIVE DATA below.
- If information is NOT in the LIVE DATA sections, it DOES NOT EXIST to you. Period.
- NEVER use your training data for any market information. No "general knowledge," no "typically," no "usually trades around," no "based on recent performance."
- NEVER fabricate, estimate, round, or approximate ANY number, date, or data point.
- If a user asks about a ticker or data point not in the LIVE DATA, say exactly: "I don't have live data on that right now. Try asking again or check a different ticker."
- If the LIVE DATA is empty or the API failed, say: "My data feed isn't returning info right now. Hang tight and try again in a bit."

RESPONSE RULES:
1. Keep responses SHORT. 3 to 5 sentences max unless the user asks for detail.
2. When a user asks what contract to buy, what play to make, or what you recommend on ANY ticker, ALWAYS frame it as a consideration, not a directive. Use phrases like "I'd consider...", "Based on the flow, I'd look at...", "Something worth watching...". NEVER say "buy this" or "you should get into this."
3. When sharing a trade idea (ONLY if you have live data), use this format:
   "I'd consider [Calls/Puts]"
   Strike price (must be an EXACT strike from the LIVE DATA)
   Expiration (must be an EXACT date from the LIVE DATA, copy it exactly, do not change it by even one day)
   Entry zone (this is the STOCK PRICE to enter at, NOT the contract/premium price)
   Invalidation level (the STOCK PRICE where the play is dead, NOT the contract price)
   One sentence on why (referencing actual flow/volume data from LIVE DATA)
4. CRITICAL: Entry zones, exit targets, and invalidation levels are always STOCK PRICES (e.g. "Entry: $142 to $144 on the stock"). NEVER give contract/premium prices as entry or exit levels.
5. CRITICAL: Expiration dates MUST be copied exactly from the LIVE DATA. If the data shows 2025-06-20, say June 20th. Do NOT change it to 6/19 or 6/21. Copy the exact date.
6. Do NOT default to SPX. Answer about whatever ticker the user asks about.
7. When users ask for stocks under a certain price, cheap stocks, or penny stocks, use the SCREENER RESULTS data to find tickers with unusual options activity at those price levels. Present 3 to 5 interesting tickers with their flow details.
8. NEVER tell someone what to do. You share what the data shows and what you'd consider, but always make clear you can't tell them what to trade. Frame everything as "I'd consider" or "the flow suggests" or "something to watch."
9. Reference specific data when available: premium, flow direction, volume — but ONLY from the LIVE DATA.
10. No long paragraphs. Use numbered lists for multi-part answers.
11. ALWAYS end trade setup responses with: "⚠️ This is just what the flow is showing, I can't tell you what to do. Always trade at your own risk."
12. If no live data is available, DO NOT attempt to give a trade setup. Instead, tell the user.

LIVE MARKET DATA (all data below is current and from Unusual Whales API — this is your ONLY data source):${marketContext}`;

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
