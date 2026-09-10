import "server-only";

import { getServerSupabase } from "@/lib/supabase";
import {
  listCustomerIdentities,
  listCustomerIdentityAudit,
} from "@/lib/customer-identity-service";
import type { CustomerAddressInput, RegistrationInput } from "@/lib/customer-validation";

const CUSTOMER_FIELDS = [
  "id",
  "full_name",
  "phone",
  "line_id",
  "email",
  "address",
  "district",
  "sub_district",
  "province",
  "postal_code",
  "total_orders",
  "total_spent",
  "last_order_date",
  "is_active",
  "created_at",
].join(",");

export interface CustomerAddressRecord {
  id: string;
  customer_id: number;
  recipient_name: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export async function registerCustomerWithAddress(
  input: RegistrationInput,
  metadata: { ipAddress: string | null; userAgent: string | null },
): Promise<number> {
  const { data, error } = await getServerSupabase().rpc("register_customer_with_address", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_line_id: input.lineId,
    p_email: input.email,
    p_legacy_address: input.legacyAddress,
    p_district: input.district,
    p_sub_district: input.subDistrict,
    p_province: input.province,
    p_postal_code: input.postalCode,
    p_shipping_address: input.shippingAddress,
    p_accept_marketing: input.acceptedMarketing,
    p_ip_address: metadata.ipAddress,
    p_user_agent: metadata.userAgent,
  });

  if (error) throw error;
  if (typeof data !== "number") throw new Error("Customer registration returned an invalid ID");
  return data;
}

export async function listCustomers(options: {
  query: string;
  page: number;
  pageSize: number;
}) {
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;
  const search = options.query.trim().slice(0, 100);

  let request = getServerSupabase()
    .from("customers")
    .select(CUSTOMER_FIELDS, { count: "exact" });

  if (search) {
    const digits = search.replace(/\D/g, "");
    if (/^[+()\d\s-]+$/.test(search) && digits.length >= 3) {
      request = request.ilike("phone", `${digits}%`);
    } else if (search.includes("@")) {
      request = request.ilike("email", `%${search}%`);
    } else {
      request = request.ilike("full_name", `%${search}%`);
    }
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { customers: data ?? [], total: count ?? 0 };
}

export async function getCustomerDetail(customerId: number) {
  const client = getServerSupabase();
  const [customerResult, addressResult, identities, identityAudit] = await Promise.all([
    client.from("customers").select(CUSTOMER_FIELDS).eq("id", customerId).maybeSingle(),
    client
      .from("customer_addresses")
      .select("id,customer_id,recipient_name,phone,address,province,postal_code,is_default,created_at,updated_at")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    listCustomerIdentities(customerId),
    listCustomerIdentityAudit(customerId),
  ]);

  if (customerResult.error) throw customerResult.error;
  if (addressResult.error) throw addressResult.error;
  if (!customerResult.data) return null;

  return {
    customer: customerResult.data,
    addresses: (addressResult.data ?? []) as CustomerAddressRecord[],
    identities,
    identity_audit: identityAudit,
  };
}

export async function saveCustomerAddress(
  customerId: number,
  addressId: string | null,
  input: CustomerAddressInput,
): Promise<string> {
  const { data, error } = await getServerSupabase().rpc("save_customer_address", {
    p_customer_id: customerId,
    p_address_id: addressId,
    p_recipient_name: input.recipientName,
    p_phone: input.phone,
    p_address: input.address,
    p_province: input.province,
    p_postal_code: input.postalCode,
    p_is_default: input.isDefault,
  });

  if (error) throw error;
  if (typeof data !== "string") throw new Error("Address save returned an invalid ID");
  return data;
}

export async function removeCustomerAddress(
  customerId: number,
  addressId: string,
): Promise<boolean> {
  const { data, error } = await getServerSupabase().rpc("delete_customer_address", {
    p_customer_id: customerId,
    p_address_id: addressId,
  });

  if (error) throw error;
  return data === true;
}
