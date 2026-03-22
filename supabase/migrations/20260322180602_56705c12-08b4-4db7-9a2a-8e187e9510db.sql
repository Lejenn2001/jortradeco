
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trade_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  ticker TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trades"
ON public.trades FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
ON public.trades FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
ON public.trades FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
ON public.trades FOR DELETE TO authenticated
USING (auth.uid() = user_id);
