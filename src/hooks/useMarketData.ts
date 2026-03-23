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
  explanation?: string;
}

export type SignalTimeframe = "buy_now" | "short_term" | "swing";

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
  createdAt?: string;
  timeframe?: SignalTimeframe;
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
    tags: ["Call Flow", "Sweep", "🔥 ACT NOW"],
    strike: "$145",
    expiry: "March 27, 2026",
    premium: "$2.8M",
    putCall: "call",
    suggestedTrade: "Buy NVDA $145 Calls expiring March 27",
    entryTrigger: "Break above $143.50 with volume confirmation",
    invalidation: "$138.00",
    keyLevel: "$141.50",
    targetZone: "$148.00 – $152.00",
    timeframe: "buy_now",
  },
  {
    id: "ex-2",
    ticker: "TSLA",
    type: "bearish",
    confidence: 9.1,
    description: "Aggressive put sweeps on TSLA totaling $1.9M in premium. The $250 puts expiring March 27 saw 6 consecutive sweeps at the ask within 12 minutes. Dark pool prints confirm institutional selling pressure near $260 resistance.",
    timestamp: "Fri 2:58 PM",
    tags: ["Put Flow", "Sweep", "🔥 ACT NOW"],
    strike: "$250",
    expiry: "March 27, 2026",
    premium: "$1.9M",
    putCall: "put",
    suggestedTrade: "Buy TSLA $250 Puts expiring March 27",
    entryTrigger: "Rejection at $258 – $260 resistance zone",
    invalidation: "$265.00",
    keyLevel: "$255.00",
    targetZone: "$242.00 – $245.00",
    timeframe: "short_term",
  },
  {
    id: "ex-3",
    ticker: "AAPL",
    type: "bullish",
    confidence: 9.6,
    description: "Whale alert: single-block $3.1M call order on AAPL $215 strike. Unusual volume spike with 5.8x average call volume. Options market makers are actively hedging long delta — a strong signal of directional conviction from smart money.",
    timestamp: "Fri 1:15 PM",
    tags: ["Call Flow", "Block", "🔥 ACT NOW"],
    strike: "$215",
    expiry: "March 27, 2026",
    premium: "$3.1M",
    putCall: "call",
    suggestedTrade: "Buy AAPL $215 Calls expiring March 27",
    entryTrigger: "Hold above $212 support with increasing bid volume",
    invalidation: "$208.00",
    keyLevel: "$213.00",
    targetZone: "$218.00 – $222.00",
    timeframe: "buy_now",
  },
  {
    id: "ex-4",
    ticker: "SPY",
    type: "bearish",
    confidence: 9.8,
    description: "Extreme put sweep cluster on SPY — $4.5M in $570 puts expiring March 27. 9 sweeps in under 20 minutes, all filled at the ask. Put/call ratio spiked to 2.1x. This is the highest conviction bearish flow seen this week across all indices.",
    timestamp: "Fri 12:30 PM",
    tags: ["Put Flow", "Sweep", "🔥 ACT NOW"],
    strike: "$570",
    expiry: "March 27, 2026",
    premium: "$4.5M",
    putCall: "put",
    suggestedTrade: "Buy SPY $570 Puts expiring March 27",
    entryTrigger: "Break below $572 with VIX expansion",
    invalidation: "$578.00",
    keyLevel: "$573.50",
    targetZone: "$564.00 – $567.00",
    timeframe: "buy_now",
  },
  {
    id: "ex-5",
    ticker: "PLTR",
    type: "bullish",
    confidence: 9.2,
    description: "Repeat call sweeps on PLTR at the $120 strike — $1.4M total premium across 4 sweeps. Unusual whales flagged this as top-tier flow. Open interest is building rapidly and the stock is consolidating near a breakout level.",
    timestamp: "Fri 11:45 AM",
    tags: ["Call Flow", "Sweep", "🔥 ACT NOW"],
    strike: "$120",
    expiry: "March 27, 2026",
    premium: "$1.4M",
    putCall: "call",
    suggestedTrade: "Buy PLTR $120 Calls expiring March 27",
    entryTrigger: "Break above $118 with volume surge",
    invalidation: "$114.00",
    keyLevel: "$117.50",
    targetZone: "$123.00 – $126.00",
    timeframe: "swing",
  },
  {
    id: "ex-6",
    ticker: "AMD",
    type: "bearish",
    confidence: 10.0,
    description: "Highest-conviction signal of the week: $5.2M in AMD $110 put sweeps. 12 consecutive sweeps at the ask, all within a 15-minute window. Dark pool short volume hit 62% — the highest level in 30 days. Smart money is positioning aggressively bearish.",
    timestamp: "Fri 10:22 AM",
    tags: ["Put Flow", "Sweep", "🔥 ACT NOW"],
    strike: "$110",
    expiry: "March 27, 2026",
    premium: "$5.2M",
    putCall: "put",
    suggestedTrade: "Buy AMD $110 Puts expiring March 27",
    entryTrigger: "Breakdown below $112 support",
    invalidation: "$116.50",
    keyLevel: "$112.00",
    targetZone: "$105.00 – $107.00",
    timeframe: "buy_now",
  },
];

function classifyTimeframe(signal: { confidence: number; expiry?: string; createdAt?: string }): SignalTimeframe {
  // Highest conviction or same-day expiry = BUY NOW
  if (signal.confidence >= 9.5) return "buy_now";
  
  if (signal.expiry) {
    const expiryDate = new Date(signal.expiry);
    const now = new Date();
    const daysOut = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOut <= 1) return "buy_now";
    if (daysOut <= 3) return "short_term";
    return "swing";
  }
  
  // Default: use confidence as tiebreaker
  if (signal.confidence >= 9.0) return "short_term";
  return "swing";
}

const CACHE_KEY = 'jortrade-signals-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadCachedSignals(): MarketSignal[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { signals, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return signals;
  } catch { return null; }
}

function saveCachedSignals(signals: MarketSignal[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ signals, timestamp: Date.now() }));
  } catch {}
}

export function useMarketData() {
  const [signals, setSignals] = useState<MarketSignal[]>(() => loadCachedSignals() || exampleSignals);
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
      type SignalWithPremium = MarketSignal & { _totalPremium: number };
      const allSignals: SignalWithPremium[] = alerts.map((alert: any, i: number) => {
        const putCall = alert.type === 'call' ? 'call' : 'put';
        const isBullish = putCall === 'call';
        const ticker = alert.ticker || alert.underlying_symbol || 'N/A';
        const strike = alert.strike || '—';
        const totalPremium = parseFloat(alert.total_premium || alert.premium || '0');
        const premium = formatPremium(totalPremium);
        const expiry = alert.expiry || alert.expires || 'N/A';
        const flowType = alert.alert_rule?.includes('Sweep') ? 'Sweep' : 
                         alert.alert_rule?.includes('Block') ? 'Block' : 
                         alert.alert_rule?.includes('Repeated') ? 'Repeated Hits' : 'Flow';
        const volOiRatio = alert.volume_oi_ratio ? parseFloat(alert.volume_oi_ratio) : null;
        const tradeCount = alert.trade_count || 0;

        const confidence = volOiRatio && volOiRatio > 10 ? 9.5 : 
                          volOiRatio && volOiRatio > 3 ? 9.0 : 
                          tradeCount > 8 ? 8.8 : 
                          tradeCount > 5 ? 8.5 : 8.0;

        const urgencyTag = confidence >= 9.0 ? '🔥 ACT NOW' : confidence >= 8.5 ? '⚡ HIGH CONVICTION' : null;
        const tags = [
          putCall === 'call' ? 'Call Flow' : 'Put Flow',
          flowType,
          ...(urgencyTag ? [urgencyTag] : []),
        ].filter(Boolean);

        return {
          id: alert.id || String(i),
          ticker,
          type: isBullish ? 'bullish' as const : 'bearish' as const,
          confidence,
          _totalPremium: totalPremium,
          description: `${tradeCount} ${putCall} trades detected on ${ticker} at $${strike} strike. Total premium: $${premium}. Volume/OI ratio: ${volOiRatio ? volOiRatio.toFixed(1) + 'x' : 'N/A'} — ${volOiRatio && volOiRatio > 3 ? 'significant new positioning' : 'active flow'}.`,
          timestamp: alert.created_at ? timeAgo(alert.created_at) : 'Time unavailable',
          createdAt: alert.created_at || '',
          tags,
          strike: `$${strike}`,
          expiry: expiry && expiry !== 'N/A' ? expiry : undefined,
          premium: `$${premium}`,
          putCall: putCall as 'call' | 'put',
          suggestedTrade: `Buy ${ticker} $${strike} ${putCall === 'call' ? 'Calls' : 'Puts'}${expiry && expiry !== 'N/A' ? ` expiring ${expiry}` : ''}`,
          entryTrigger: isBullish ? `Break above $${strike} with volume` : `Break below $${strike} with volume`,
          invalidation: isBullish ? `$${(parseFloat(strike) * 0.97).toFixed(2)}` : `$${(parseFloat(strike) * 1.03).toFixed(2)}`,
          keyLevel: `$${(parseFloat(strike) * (isBullish ? 0.99 : 1.01)).toFixed(2)}`,
          targetZone: isBullish 
            ? `$${(parseFloat(strike) * 1.02).toFixed(2)} – $${(parseFloat(strike) * 1.05).toFixed(2)}`
            : `$${(parseFloat(strike) * 0.95).toFixed(2)} – $${(parseFloat(strike) * 0.98).toFixed(2)}`,
        } as MarketSignal & { _totalPremium: number };
      });

      // Filter to 8.5+ confidence only
      const filtered = allSignals.filter(s => s.confidence >= 8.5);

      // Deduplicate: per ticker, keep only the dominant side (highest total premium)
      const tickerMap = new Map<string, (typeof allSignals)[0]>();
      for (const signal of filtered) {
        const existing = tickerMap.get(signal.ticker);
        if (!existing || signal._totalPremium > existing._totalPremium) {
          tickerMap.set(signal.ticker, signal);
        }
      }

      // Sort newest first, no hard limit — let the pages decide what to show
      const liveDeduped: MarketSignal[] = Array.from(tickerMap.values())
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .map(({ _totalPremium, ...signal }) => ({
          ...signal,
          timeframe: classifyTimeframe(signal),
        }));

      // Merge: live data takes priority, fill remaining with examples
      const liveTickers = new Set(liveDeduped.map(s => s.ticker));
      const fillerSignals = exampleSignals.filter(s => !liveTickers.has(s.ticker));
      const merged = [...liveDeduped, ...fillerSignals];

      if (merged.length > 0) {
        setSignals(merged);
        saveCachedSignals(merged);
      }

      // Whale alerts now fetched separately via fetchWhaleAlerts
    } catch (e) {
      console.error('Failed to fetch flow alerts:', e);
    }
  }, []);

  const fetchWhaleAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'whale-alerts' },
      });
      if (error) throw error;

      const alerts = data?.data || [];
      if (alerts.length === 0) return; // keep example fallbacks

      const newWhaleAlerts: FlowAlert[] = alerts.map((alert: any) => {
        const putCall = alert.type === 'call' ? 'Call' : 'Put';
        const flowPattern = alert.alert_rule?.includes('Sweep') ? 'Sweep'
          : alert.alert_rule?.includes('Block') ? 'Block'
          : alert.alert_rule?.includes('Repeated') ? 'Repeated Hits' : 'Flow';
        const ticker = alert.ticker || alert.underlying_symbol || 'N/A';
        const strike = alert.strike || '—';
        const premium = formatPremium(alert.total_premium || alert.premium);
        const isBullish = alert.type === 'call';

        return {
          ticker,
          type: `${putCall} ${flowPattern}`,
          premium: `$${premium}`,
          strike: `$${strike}`,
          expiry: alert.expiry || alert.expires || '—',
          sentiment: isBullish ? 'bullish' as const : 'bearish' as const,
          time: alert.created_at ? timeAgo(alert.created_at) : 'just now',
          explanation: `${alert.trade_count || 'Multiple'} ${putCall.toLowerCase()} ${flowPattern.toLowerCase()}${alert.trade_count > 1 ? 's' : ''} detected on ${ticker} at $${strike} strike with $${premium} total premium. ${alert.volume_oi_ratio ? `Volume/OI ratio is ${parseFloat(alert.volume_oi_ratio).toFixed(1)}x — ` : ''}${isBullish ? 'Bullish' : 'Bearish'} institutional positioning with significant capital commitment.`,
        };
      });

      // Deduplicate: keep highest premium per ticker
      const tickerMap = new Map<string, FlowAlert>();
      for (const alert of newWhaleAlerts) {
        const existing = tickerMap.get(alert.ticker);
        if (!existing || parsePremium(alert.premium) > parsePremium(existing.premium)) {
          tickerMap.set(alert.ticker, alert);
        }
      }

      const deduped = Array.from(tickerMap.values())
        .sort((a, b) => parsePremium(b.premium) - parsePremium(a.premium))
        .slice(0, 8);

      if (deduped.length > 0) setWhaleAlerts(deduped);
    } catch (e) {
      console.error('Failed to fetch whale alerts:', e);
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
        await Promise.all([fetchFlowAlerts(), fetchWhaleAlerts(), fetchMarketOverview()]);
      } catch (e) {
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    // Always fetch once on mount so dashboard isn't empty
    load();

    // Only poll when market-adjacent sessions are active (4 AM – 8 PM ET, weekdays + Sunday 6 PM+)
    const shouldPoll = (): boolean => {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
      });
      const parts = fmt.formatToParts(now);
      const get = (t: string) => parts.find(p => p.type === t)?.value || "";
      const weekday = get("weekday");
      const hour = parseInt(get("hour")) % 24;
      const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      // Only poll Monday–Friday, 4 AM – 8 PM ET
      return weekdays.includes(weekday) && hour >= 4 && hour < 20;
    };

    const interval = setInterval(() => {
      if (shouldPoll()) {
        fetchFlowAlerts();
        fetchWhaleAlerts();
        fetchMarketOverview();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchFlowAlerts, fetchWhaleAlerts, fetchMarketOverview]);

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

function parsePremium(str: string): number {
  const clean = str.replace(/[$,]/g, '');
  if (clean.endsWith('M')) return parseFloat(clean) * 1_000_000;
  if (clean.endsWith('K')) return parseFloat(clean) * 1_000;
  return parseFloat(clean) || 0;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);

  // If data is from today, show relative time
  if (isToday(dateStr)) {
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  // If data is older than today, show actual day/time so users know it's not fresh
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[then.getDay()];
  const h = then.getHours();
  const m = then.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${day} ${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
