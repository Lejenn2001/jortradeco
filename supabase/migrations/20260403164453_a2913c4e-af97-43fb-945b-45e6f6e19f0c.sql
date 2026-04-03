
-- Add pinned and reply_to columns to chat_messages
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create chat_reactions table
CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on chat_reactions
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reactions
CREATE POLICY "Authenticated users can read reactions"
  ON public.chat_reactions FOR SELECT TO authenticated
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add own reactions"
  ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON public.chat_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat images
CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-images');
