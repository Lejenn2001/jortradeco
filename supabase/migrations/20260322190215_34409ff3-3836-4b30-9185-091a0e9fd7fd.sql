CREATE OR REPLACE FUNCTION public.notify_biddie_on_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if the message is from Biddie itself
  IF NEW.user_id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN NEW;
  END IF;

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := 'https://koqvhfbgqdwkkukbydwt.supabase.co/functions/v1/biddie-auto-post',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcXZoZmJncWR3a2t1a2J5ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjIzMTYsImV4cCI6MjA4OTczODMxNn0.Ud2_nOxyee55zMQPM6gm5Z5WEWoMzcvSB4XeAiwjfuw"}'::jsonb,
    body := jsonb_build_object(
      'action', 'reply',
      'message', NEW.content,
      'user_name', NEW.user_name,
      'user_id', NEW.user_id,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_message_notify_biddie
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_biddie_on_chat();