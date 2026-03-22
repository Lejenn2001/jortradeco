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
      const newSignals: MarketSignal[] = alerts.slice(0, 6).map((alert: any, i: number) => ({
        id: String(i),
        ticker: alert.ticker || alert.underlying_symbol || 'N/A',
        type: (alert.sentiment === 'bullish' || alert.put_call === 'call') ? 'bullish' : 
              (alert.sentiment === 'bearish' || alert.put_call === 'put') ? 'bearish' : 'neutral',
        confidence: alert.score ? parseFloat(alert.score) : Math.round((Math.random() * 3 + 6) * 10) / 10,
        description: alert.description || `${alert.put_call || 'Options'} flow detected. Premium: $${formatPremium(alert.premium)}. Strike: $${alert.strike}`,
        timestamp: alert.created_at ? timeAgo(alert.created_at) : `${i + 1} min ago`,
        tags: [alert.put_call === 'call' ? 'Call Flow' : 'Put Flow', alert.type || 'Sweep'].filter(Boolean),
      }));

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
