create index stock_reservations_order_item_order_idx
  on public.stock_reservations (order_item_id, order_id);
