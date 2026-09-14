-- Telegram order alerts are configured by an authorized admin. The bot token
-- remains in the server environment; only the selected destination is stored.
create table public.telegram_notification_settings (
  id text primary key,
  chat_id text not null,
  chat_title text not null,
  chat_type text not null,
  enabled boolean not null default true,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_notification_settings_singleton_check
    check (id = 'order_alerts'),
  constraint telegram_notification_settings_chat_id_check
    check (chat_id ~ '^-?[0-9]{1,30}$'),
  constraint telegram_notification_settings_chat_title_check
    check (char_length(chat_title) between 1 and 200),
  constraint telegram_notification_settings_chat_type_check
    check (chat_type in ('private', 'group', 'supergroup', 'channel')),
  constraint telegram_notification_settings_updated_by_check
    check (char_length(updated_by) between 1 and 150)
);

create trigger telegram_notification_settings_set_updated_at
before update on public.telegram_notification_settings
for each row
execute function public.set_updated_at();

create table public.telegram_notification_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  telegram_message_id bigint,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_notification_events_order_event_key
    unique (order_id, event_type),
  constraint telegram_notification_events_event_type_check
    check (event_type in ('order_created', 'payment_received', 'warehouse_problem')),
  constraint telegram_notification_events_status_check
    check (status in ('pending', 'sending', 'sent', 'failed')),
  constraint telegram_notification_events_attempt_count_check
    check (attempt_count between 0 and 20),
  constraint telegram_notification_events_last_error_check
    check (last_error is null or char_length(last_error) <= 300)
);

create index telegram_notification_events_retry_idx
  on public.telegram_notification_events (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

create trigger telegram_notification_events_set_updated_at
before update on public.telegram_notification_events
for each row
execute function public.set_updated_at();

alter table public.telegram_notification_settings enable row level security;
alter table public.telegram_notification_events enable row level security;

revoke all on table public.telegram_notification_settings from public, anon, authenticated, service_role;
revoke all on table public.telegram_notification_events from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.telegram_notification_settings to service_role;
grant select, insert, update, delete on table public.telegram_notification_events to service_role;

comment on table public.telegram_notification_settings is
  'Server-only Telegram destination settings. Bot credentials are never stored here.';
comment on table public.telegram_notification_events is
  'Server-only idempotency and delivery log for Telegram operational alerts.';
