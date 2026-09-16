-- The status-only shipment APIs have been deployed. Remove the legacy
-- overloads so no server path can require or persist new tracking data.

drop function if exists public.mark_warehouse_order_shipped(uuid, text, text, text);
drop function if exists public.mark_order_shipped(uuid, text, text, text);
