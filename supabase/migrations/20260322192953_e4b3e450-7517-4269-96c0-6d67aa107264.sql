CREATE TABLE public.api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL DEFAULT 'unusual_whales',
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read usage logs
CREATE POLICY "Admins can read api usage"
ON public.api_usage_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts (from edge functions), no user insert policy needed

CREATE INDEX idx_api_usage_created ON public.api_usage_log (created_at DESC);
CREATE INDEX idx_api_usage_name ON public.api_usage_log (api_name);