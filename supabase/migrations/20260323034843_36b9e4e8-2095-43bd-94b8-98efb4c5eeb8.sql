
CREATE TABLE public.user_alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_enabled boolean NOT NULL DEFAULT false,
  telegram_chat_id text,
  push_enabled boolean NOT NULL DEFAULT false,
  push_subscription jsonb,
  alert_signals boolean NOT NULL DEFAULT true,
  alert_whales boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert preferences"
  ON public.user_alert_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
  ON public.user_alert_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
  ON public.user_alert_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all preferences"
  ON public.user_alert_preferences FOR SELECT
  TO service_role
  USING (true);
