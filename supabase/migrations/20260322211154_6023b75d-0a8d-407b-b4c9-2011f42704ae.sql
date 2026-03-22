
-- Add a unique constraint to prevent duplicate signal logging
ALTER TABLE public.signal_outcomes ADD COLUMN signal_source text DEFAULT 'auto';
ALTER TABLE public.signal_outcomes ADD CONSTRAINT unique_signal_ticker_date UNIQUE (ticker, signal_type, strike, expiry, signal_source);
