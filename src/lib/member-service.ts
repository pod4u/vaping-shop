import "server-only";

import { getServerSupabase } from "@/lib/supabase";

export async function getMemberDashboard(customerId: number) {
  const client = getServerSupabase();
  const [customerResult, addressResult, orderResult, authAccountResult] = await Promise.all([
    client.from("customers").select("id,full_name,phone,email,total_orders,total_spent,created_at,is_active").eq("id", customerId).maybeSingle(),
    client.from("customer_addresses").select("id,recipient_name,phone,address,province,postal_code,is_default").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    client.from("orders").select("id,order_number,order_source,status,subtotal,shipping_fee,discount_amount,discount_credit_id,total,created_at,carrier,tracking_number,shipped_at,delivered_at,shipping_name,shipping_phone,shipping_address,shipping_province,shipping_postal_code").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(50),
    client.from("member_auth_accounts").select("customer_id").eq("customer_id", customerId).maybeSingle(),
  ]);
  if (customerResult.error) throw customerResult.error;
  if (addressResult.error) throw addressResult.error;
  if (orderResult.error) throw orderResult.error;
  if (authAccountResult.error) throw authAccountResult.error;
  if (!customerResult.data?.is_active) return null;
  const orderIds = (orderResult.data ?? []).map((order) => order.id);
  const [itemResult, reviewResult, creditResult] = await Promise.all([
    orderIds.length > 0
      ? client
          .from("order_items")
          .select("id,order_id,product_flavor_id,product_name,flavor_name,brand_name,variant_key,sku,unit_price,quantity,total_price")
          .in("order_id", orderIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? client
          .from("order_reviews")
          .select("id,order_id,rating,category,review_text,status,rejection_reason,submitted_at")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    client.rpc("get_customer_available_credit", {
      p_customer_id: customerId,
    }),
  ]);
  if (itemResult.error) throw itemResult.error;
  if (reviewResult.error) throw reviewResult.error;
  if (creditResult.error) throw creditResult.error;

  type MemberOrderItem = {
    id: string;
    order_id: string;
    product_flavor_id: string;
    product_name: string;
    flavor_name: string;
    brand_name: string;
    variant_key: string;
    sku: string;
    unit_price: number | string;
    quantity: number;
    total_price: number | string;
  };
  const orderItems = (itemResult.data ?? []) as MemberOrderItem[];
  const itemsByOrder = new Map<string, MemberOrderItem[]>();
  for (const item of orderItems) {
    const items = itemsByOrder.get(item.order_id) ?? [];
    items.push(item);
    itemsByOrder.set(item.order_id, items);
  }

  const reviewsByOrder = new Map<string, typeof reviewResult.data[0]>();
  for (const review of reviewResult.data ?? []) {
    reviewsByOrder.set(review.order_id, review);
  }

  return {
    customer: customerResult.data,
    hasWebPassword: Boolean(authAccountResult.data),
    addresses: addressResult.data ?? [],
    orders: (orderResult.data ?? []).map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
      review: reviewsByOrder.get(order.id) ?? null,
    })),
    availableCredit: Number(creditResult.data ?? 0),
  };
}
