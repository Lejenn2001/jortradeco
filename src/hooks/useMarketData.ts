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
}

export interface TickerData {
  overview: any;
  volume: any;
}

export function useMarketData() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
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
      
      // Transform flow alerts into signals
      const newSignals: MarketSignal[] = alerts.slice(0, 6).map((alert: any, i: number) => {
        const isBullish = alert.sentiment === 'bullish' || alert.put_call === 'call';
        const putCall = alert.put_call === 'call' ? 'call' : 'put';
        const ticker = alert.ticker || alert.underlying_symbol || 'N/A';
        const strike = alert.strike || '—';
        const premium = formatPremium(alert.premium);
        const expiry = alert.expiry || alert.expires || 'N/A';
        const flowType = alert.type || 'Sweep';

        return {
          id: String(i),
          ticker,
          type: isBullish ? 'bullish' as const : 'bearish' as const,
          confidence: alert.score ? parseFloat(alert.score) : Math.round((Math.random() * 3 + 6) * 10) / 10,
          description: `Repeated ${expiry === '0DTE' || isToday(alert.expiry) ? '0DTE' : ''} ${putCall} ${flowType.toLowerCase()}s at $${strike} strike. Large premium > $${premium}.`,
          timestamp: alert.created_at ? timeAgo(alert.created_at) : `${i + 1} min ago`,
          tags: [putCall === 'call' ? 'Call Flow' : 'Put Flow', flowType].filter(Boolean),
          strike: `$${strike}`,
          expiry,
          premium: `$${premium}`,
          putCall: putCall as 'call' | 'put',
          suggestedTrade: `Buy ${strike} ${putCall}s expiring ${expiry}`,
          entryTrigger: isBullish ? `Above ${strike} level` : `Below ${strike} level`,
          invalidation: isBullish ? 'Back below VWAP' : 'Back above VWAP',
        };
      });

      if (newSignals.length > 0) setSignals(newSignals);

      // Transform into whale alerts
      const newWhaleAlerts: FlowAlert[] = alerts.slice(0, 8).map((alert: any) => ({
        ticker: alert.ticker || alert.underlying_symbol || 'N/A',
        type: `${alert.put_call === 'call' ? 'Call' : 'Put'} ${alert.type || 'Sweep'}`,
        premium: `$${formatPremium(alert.premium)}`,
        strike: `$${alert.strike || '—'}`,
        expiry: alert.expiry || alert.expires || '—',
        sentiment: (alert.sentiment === 'bullish' || alert.put_call === 'call') ? 'bullish' : 'bearish',
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
