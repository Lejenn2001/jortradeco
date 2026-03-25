
CREATE TABLE public.signal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.signal_outcomes(id) ON DELETE CASCADE NOT NULL,
  ticker text NOT NULL,
  alert_type text NOT NULL, -- 'invalidated', 'target_hit', 'expired'
  message text NOT NULL,
  current_price numeric,
  trigger_price numeric,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_alerts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read alerts (signals are shared)
CREATE POLICY "Authenticated users can read signal alerts"
  ON public.signal_alerts FOR SELECT TO authenticated
  USING (true);

-- Allow service role inserts (from edge function)
CREATE POLICY "Service role can insert alerts"
  ON public.signal_alerts FOR INSERT TO service_role
  WITH CHECK (true);

-- Users can mark alerts as read
CREATE POLICY "Authenticated users can update alerts"
  ON public.signal_alerts FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_alerts;
