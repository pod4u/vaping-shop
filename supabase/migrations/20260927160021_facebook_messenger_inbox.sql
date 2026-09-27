create table public.facebook_conversations (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  participant_id text not null,
  display_name text,
  profile_picture_url text,
  status text not null default 'open',
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facebook_conversations_identity_key unique (page_id, participant_id),
  constraint facebook_conversations_status_check check (status in ('open', 'resolved')),
  constraint facebook_conversations_unread_count_check check (unread_count >= 0)
);

create index facebook_conversations_last_message_idx
  on public.facebook_conversations (last_message_at desc);

create table public.facebook_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.facebook_conversations (id) on delete cascade,
  provider_message_id text,
  direction text not null,
  message_type text not null default 'text',
  message_text text,
  automation_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint facebook_messages_provider_message_key unique (provider_message_id),
  constraint facebook_messages_direction_check check (direction in ('inbound', 'outbound')),
  constraint facebook_messages_type_check check (message_type in ('text', 'image', 'attachment', 'postback', 'unknown'))
);

create index facebook_messages_conversation_created_idx
  on public.facebook_messages (conversation_id, created_at desc);

create index facebook_messages_automation_idx
  on public.facebook_messages (conversation_id, automation_key, created_at desc)
  where automation_key is not null;

alter table public.facebook_conversations enable row level security;
alter table public.facebook_messages enable row level security;

revoke all on table public.facebook_conversations from public, anon, authenticated;
revoke all on table public.facebook_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.facebook_conversations to service_role;
grant select, insert, update, delete on table public.facebook_messages to service_role;

comment on table public.facebook_conversations is
  'Private Messenger inbox state. Server/service_role access only.';

comment on table public.facebook_messages is
  'Inbound and outbound Facebook Page messages. Server/service_role access only.';
