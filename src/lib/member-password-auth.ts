import "server-only";

import { createHmac } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase";

export class MemberPasswordAuthError extends Error {
  constructor(readonly reason: "invalid" | "unavailable" | "conflict") {
    super(reason);
    this.name = "MemberPasswordAuthError";
  }
}

function internalLoginEmail(customerId: number): string {
  const secret = process.env.CUSTOMER_LINK_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) throw new MemberPasswordAuthError("unavailable");
  const opaqueId = createHmac("sha256", secret)
    .update(`member-password:${customerId}`)
    .digest("hex")
    .slice(0, 32);
  return `member-${opaqueId}@auth.pod4u.store`;
}

export async function setMemberPassword(customerId: number, password: string) {
  const admin = getServerSupabase();
  const [{ data: customer, error: customerError }, { data: account, error: accountError }] = await Promise.all([
    admin.from("customers").select("id,is_active").eq("id", customerId).maybeSingle(),
    admin.from("member_auth_accounts").select("auth_user_id,login_email").eq("customer_id", customerId).maybeSingle(),
  ]);
  if (customerError || accountError) throw new MemberPasswordAuthError("unavailable");
  if (!customer?.is_active) throw new MemberPasswordAuthError("invalid");

  if (account) {
    const { error } = await admin.auth.admin.updateUserById(account.auth_user_id, { password });
    if (error) throw new MemberPasswordAuthError("unavailable");
    const { error: timestampError } = await admin
      .from("member_auth_accounts")
      .update({ password_set_at: new Date().toISOString() })
      .eq("customer_id", customerId);
    if (timestampError) throw new MemberPasswordAuthError("unavailable");
    return { created: false };
  }

  const loginEmail = internalLoginEmail(customerId);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    app_metadata: { pod4u_member: true },
  });
  if (createError || !created.user) {
    throw new MemberPasswordAuthError(createError?.status === 422 ? "conflict" : "unavailable");
  }

  const { error: linkError } = await admin.from("member_auth_accounts").insert({
    customer_id: customerId,
    auth_user_id: created.user.id,
    login_email: loginEmail,
  });
  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new MemberPasswordAuthError(linkError.code === "23505" ? "conflict" : "unavailable");
  }
  return { created: true };
}

export async function loginMemberWithPassword(phone: string, password: string): Promise<number> {
  const lookup = getServerSupabase();
  const { data: customer, error: customerError } = await lookup
    .from("customers")
    .select("id,is_active")
    .eq("phone", phone)
    .maybeSingle();
  if (customerError) throw new MemberPasswordAuthError("unavailable");
  if (!customer?.is_active) throw new MemberPasswordAuthError("invalid");

  const { data: account, error: accountError } = await lookup
    .from("member_auth_accounts")
    .select("auth_user_id,login_email")
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (accountError) throw new MemberPasswordAuthError("unavailable");
  if (!account) throw new MemberPasswordAuthError("invalid");

  const authClient = getServerSupabase();
  const { data: auth, error: authError } = await authClient.auth.signInWithPassword({
    email: account.login_email,
    password,
  });
  if (authError || !auth.user || auth.user.id !== account.auth_user_id) {
    throw new MemberPasswordAuthError("invalid");
  }

  await lookup
    .from("member_auth_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("customer_id", customer.id);
  return customer.id;
}
