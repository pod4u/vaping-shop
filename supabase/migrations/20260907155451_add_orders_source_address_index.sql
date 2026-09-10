create index orders_source_address_id_idx
  on public.orders (source_address_id)
  where source_address_id is not null;
