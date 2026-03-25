import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    const symbolList = (symbols || ['SPY','QQQ','NVDA','AAPL','TSLA','AMD','AMZN','META','MSFT','GOOGL']) as string[];

    const results = await Promise.allSettled(
      symbolList.map(async (symbol: string) => {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (!r.ok) throw new Error(`Failed ${symbol}: ${r.status}`);
        const data = await r.json();
        const meta = data.chart.result[0].meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        const change = price - prevClose;
        const changePct = (change / prevClose) * 100;
        return {
          symbol,
          price: price.toFixed(2),
          change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
          changePercent: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
          isUp: change >= 0,
        };
      })
    );

    const quotes = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    return new Response(JSON.stringify({ quotes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('stock-quotes error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch quotes', quotes: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
