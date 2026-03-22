
CREATE TABLE public.signal_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticker text NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('bullish', 'bearish')),
  put_call text CHECK (put_call IN ('call', 'put')),
  confidence numeric NOT NULL,
  strike text,
  expiry text,
  target_zone text,
  entry_price numeric,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'hit', 'missed', 'expired')),
  outcome_price numeric,
  resolved_at timestamptz,
  description text,
  premium text
);

ALTER TABLE public.signal_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage signal outcomes"
  ON public.signal_outcomes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read signal outcomes"
  ON public.signal_outcomes
  FOR SELECT
  TO authenticated
  USING (true);
