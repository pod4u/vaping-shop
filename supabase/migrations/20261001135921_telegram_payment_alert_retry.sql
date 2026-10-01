-- Retry payment alerts every two minutes independently of Vercel Hobby Cron.
-- The purpose-specific bearer token is stored separately in Supabase Vault.
create extension if not exists pg_net with schema extensions;

do $check_secret$
begin
  if not exists (
    select 1 from vault.secrets
    where name = 'pod4u_payment_alerts_cron_token'
  ) then
    raise exception 'Missing pod4u_payment_alerts_cron_token in Supabase Vault';
  end if;
end;
$check_secret$;

select cron.schedule(
  'pod4u-payment-alert-retry',
  '*/2 * * * *',
  $retry$
    select net.http_get(
      url := 'https://www.pod4u.store/api/cron/payment-alerts',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'pod4u_payment_alerts_cron_token'
        )
      ),
      timeout_milliseconds := 30000
    ) as request_id;
  $retry$
);
