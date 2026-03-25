SELECT cron.unschedule('wake-replit-8am');
SELECT cron.schedule(
  'wake-replit-8am',
  '0 12 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://python-script-lejenn2001.replit.app/api/whale/chat',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"message": "ping"}'::jsonb
  )$$
);