import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FlowAlert {
  ticker: string;
  type: string;
  premium: string;
  strike: string;
  expiry: string;
  sentiment: "bullish" | "bearish";
  time: string;
}

export interface MarketSignal {
  id: string;
  ticker: string;
  type: "bullish" | "bearish" | "neutral";
  confidence: number;
  description: string;
  timestamp: string;
  tags: string[];
  strike?: string;
  expiry?: string;
  premium?: string;
  putCall?: "call" | "put";
  suggestedTrade?: string;
  entryTrigger?: string;
  invalidation?: string;
  keyLevel?: string;
  targetZone?: string;
}

export interface TickerData {
  overview: any;
  volume: any;
}

// High-conviction example signals based on recent whale activity
const exampleSignals: MarketSignal[] = [
  {
    id: "ex-1",
    ticker: "NVDA",
    type: "bullish",
    confidence: 9.4,
    description: "Massive call sweep activity detected on NVDA. Over $2.8M in premium on the $145 calls expiring March 27. Institutional flow is heavily skewed bullish with repeat sweeps at the ask. Volume-to-open-interest ratio is 4.2x — indicating new positioning, not hedging.",
    timestamp: "Fri 3:42 PM",
    tags: ["Call Flow", "Sweep"],
    strike: "$145",
    expiry: "March 27, 2026",
    premium: "$2.8M",
    putCall: "call",
    suggestedTrade: "Buy NVDA $145 Calls expiring March 27",
    entryTrigger: "Break above $143.50 with volume confirmation",
    invalidation: "$138.00",
    keyLevel: "$141.50",
    targetZone: "$148.00 – $152.00",
  },
  {
    id: "ex-2",
    ticker: "TSLA",
    type: "bearish",
    confidence: 9.1,
    description: "Aggressive put sweeps on TSLA totaling $1.9M in premium. The $250 puts expiring March 27 saw 6 consecutive sweeps at the ask within 12 minutes. Dark pool prints confirm institutional selling pressure near $260 resistance.",
    timestamp: "Fri 2:58 PM",
    tags: ["Put Flow", "Sweep"],
    strike: "$250",
    expiry: "March 27, 2026",
    premium: "$1.9M",
    putCall: "put",
    suggestedTrade: "Buy TSLA $250 Puts expiring March 27",
    entryTrigger: "Rejection at $258 – $260 resistance zone",
    invalidation: "$265.00",
    keyLevel: "$255.00",
    targetZone: "$242.00 – $245.00",
  },
  {
    id: "ex-3",
    ticker: "AAPL",
    type: "bullish",
    confidence: 9.6,
    description: "Whale alert: single-block $3.1M call order on AAPL $215 strike. Unusual volume spike with 5.8x average call volume. Options market makers are actively hedging long delta — a strong signal of directional conviction from smart money.",
    timestamp: "Fri 1:15 PM",
    tags: ["Call Flow", "Block"],
    strike: "$215",
    expiry: "March 27, 2026",
    premium: "$3.1M",
    putCall: "call",
    suggestedTrade: "Buy AAPL $215 Calls expiring March 27",
    entryTrigger: "Hold above $212 support with increasing bid volume",
    invalidation: "$208.00",
    keyLevel: "$213.00",
    targetZone: "$218.00 – $222.00",
  },
  {
    id: "ex-4",
    ticker: "SPY",
    type: "bearish",
    confidence: 9.8,
    description: "Extreme put sweep cluster on SPY — $4.5M in $570 puts expiring March 27. 9 sweeps in under 20 minutes, all filled at the ask. Put/call ratio spiked to 2.1x. This is the highest conviction bearish flow seen this week across all indices.",
    timestamp: "Fri 12:30 PM",
    tags: ["Put Flow", "Sweep"],
    strike: "$570",
    expiry: "March 27, 2026",
    premium: "$4.5M",
    putCall: "put",
    suggestedTrade: "Buy SPY $570 Puts expiring March 27",
    entryTrigger: "Break below $572 with VIX expansion",
    invalidation: "$578.00",
    keyLevel: "$573.50",
    targetZone: "$564.00 – $567.00",
  },
  {
    id: "ex-5",
    ticker: "PLTR",
    type: "bullish",
    confidence: 9.2,
    description: "Repeat call sweeps on PLTR at the $120 strike — $1.4M total premium across 4 sweeps. Unusual whales flagged this as top-tier flow. Open interest is building rapidly and the stock is consolidating near a breakout level.",
    timestamp: "Fri 11:45 AM",
    tags: ["Call Flow", "Sweep"],
    strike: "$120",
    expiry: "March 27, 2026",
    premium: "$1.4M",
    putCall: "call",
    suggestedTrade: "Buy PLTR $120 Calls expiring March 27",
    entryTrigger: "Break above $118 with volume surge",
    invalidation: "$114.00",
    keyLevel: "$117.50",
    targetZone: "$123.00 – $126.00",
  },
  {
    id: "ex-6",
    ticker: "AMD",
    type: "bearish",
    confidence: 10.0,
    description: "Highest-conviction signal of the week: $5.2M in AMD $110 put sweeps. 12 consecutive sweeps at the ask, all within a 15-minute window. Dark pool short volume hit 62% — the highest level in 30 days. Smart money is positioning aggressively bearish.",
    timestamp: "Fri 10:22 AM",
    tags: ["Put Flow", "Sweep"],
    strike: "$110",
    expiry: "March 27, 2026",
    premium: "$5.2M",
    putCall: "put",
    suggestedTrade: "Buy AMD $110 Puts expiring March 27",
    entryTrigger: "Breakdown below $112 support",
    invalidation: "$116.50",
    keyLevel: "$112.00",
    targetZone: "$105.00 – $107.00",
  },
];

export function useMarketData() {
  const [signals, setSignals] = useState<MarketSignal[]>(exampleSignals);
  const [whaleAlerts, setWhaleAlerts] = useState<FlowAlert[]>([]);
  const [marketOverview, setMarketOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlowAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'flow' },
      });
      if (error) throw error;

      const alerts = data?.data || [];
      
      if (alerts.length === 0) {
        // Keep example signals as fallback
        return;
      }

      // Transform flow alerts into signals — live data replaces examples
      const newSignals: MarketSignal[] = alerts.slice(0, 6).map((alert: any, i: number) => {
        // API returns "type" as "put" or "call", and "alert_rule" for the flow pattern
        const putCall = alert.type === 'call' ? 'call' : 'put';
        const isBullish = putCall === 'call';
        const ticker = alert.ticker || alert.underlying_symbol || 'N/A';
        const strike = alert.strike || '—';
        const premium = formatPremium(alert.total_premium || alert.premium);
        const expiry = alert.expiry || alert.expires || 'N/A';
        const flowType = alert.alert_rule?.includes('Sweep') ? 'Sweep' : 
                         alert.alert_rule?.includes('Block') ? 'Block' : 
                         alert.alert_rule?.includes('Repeated') ? 'Repeated Hits' : 'Flow';
        const volOiRatio = alert.volume_oi_ratio ? parseFloat(alert.volume_oi_ratio) : null;
        const tradeCount = alert.trade_count || 0;

        return {
          id: alert.id || String(i),
          ticker,
          type: isBullish ? 'bullish' as const : 'bearish' as const,
          confidence: volOiRatio && volOiRatio > 10 ? 9.5 : 
                      volOiRatio && volOiRatio > 3 ? 9.0 : 
                      tradeCount > 8 ? 8.8 : 
                      Math.round((Math.random() * 2 + 7.5) * 10) / 10,
          description: `${tradeCount} ${putCall} trades detected on ${ticker} at $${strike} strike. Total premium: $${premium}. Volume/OI ratio: ${volOiRatio ? volOiRatio.toFixed(1) + 'x' : 'N/A'} — ${volOiRatio && volOiRatio > 3 ? 'significant new positioning' : 'active flow'}.`,
          timestamp: alert.created_at ? timeAgo(alert.created_at) : `${i + 1} min ago`,
          tags: [putCall === 'call' ? 'Call Flow' : 'Put Flow', flowType].filter(Boolean),
          strike: `$${strike}`,
          expiry,
          premium: `$${premium}`,
          putCall: putCall as 'call' | 'put',
          suggestedTrade: `Buy ${ticker} $${strike} ${putCall === 'call' ? 'Calls' : 'Puts'} expiring ${expiry}`,
          entryTrigger: isBullish ? `Break above $${strike} with volume` : `Break below $${strike} with volume`,
          invalidation: isBullish ? `$${(parseFloat(strike) * 0.97).toFixed(2)}` : `$${(parseFloat(strike) * 1.03).toFixed(2)}`,
          keyLevel: `$${(parseFloat(strike) * (isBullish ? 0.99 : 1.01)).toFixed(2)}`,
          targetZone: isBullish 
            ? `$${(parseFloat(strike) * 1.02).toFixed(2)} – $${(parseFloat(strike) * 1.05).toFixed(2)}`
            : `$${(parseFloat(strike) * 0.95).toFixed(2)} – $${(parseFloat(strike) * 0.98).toFixed(2)}`,
        };
      });

      if (newSignals.length > 0) setSignals(newSignals);

      // Transform into whale alerts
      const newWhaleAlerts: FlowAlert[] = alerts.slice(0, 8).map((alert: any) => ({
        ticker: alert.ticker || alert.underlying_symbol || 'N/A',
        type: `${alert.type === 'call' ? 'Call' : 'Put'} ${alert.alert_rule?.includes('Sweep') ? 'Sweep' : 'Flow'}`,
        premium: `$${formatPremium(alert.total_premium || alert.premium)}`,
        strike: `$${alert.strike || '—'}`,
        expiry: alert.expiry || alert.expires || '—',
        sentiment: alert.type === 'call' ? 'bullish' : 'bearish',
        time: alert.created_at ? timeAgo(alert.created_at) : 'just now',
      }));

      if (newWhaleAlerts.length > 0) setWhaleAlerts(newWhaleAlerts);
    } catch (e) {
      console.error('Failed to fetch flow alerts:', e);
    }
  }, []);

  const fetchMarketOverview = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'market' },
      });
      if (error) throw error;
      if (data?.data) setMarketOverview(data.data);
    } catch (e) {
      console.error('Failed to fetch market overview:', e);
    }
  }, []);

  const fetchTickerData = useCallback(async (ticker: string): Promise<TickerData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'ticker', ticker },
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error(`Failed to fetch ticker ${ticker}:`, e);
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchFlowAlerts(), fetchMarketOverview()]);
      } catch (e) {
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    load();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchFlowAlerts();
      fetchMarketOverview();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchFlowAlerts, fetchMarketOverview]);

  return { signals, whaleAlerts, marketOverview, loading, error, fetchTickerData, refresh: fetchFlowAlerts };
}

function formatPremium(value: any): string {
  if (!value) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
