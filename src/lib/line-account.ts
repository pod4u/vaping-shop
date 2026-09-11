import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildMemberLiffUrl, type LineAccountAlias } from "@/lib/line-account-links";

export interface LineAccountConfig {
  alias: LineAccountAlias;
  botUserId: string;
  channelAccessToken: string;
  channelSecret: string;
}

const accountContext = new AsyncLocalStorage<LineAccountConfig>();

function readAccount(alias: LineAccountAlias): LineAccountConfig | null {
  const prefix = alias === "primary" ? "LINE" : "LINE_SECONDARY";
  const botUserId = process.env[`${prefix}_BOT_USER_ID`]?.trim() ?? "";
  const channelAccessToken = process.env[`${prefix}_CHANNEL_ACCESS_TOKEN`]?.trim() ?? "";
  const channelSecret = process.env[`${prefix}_CHANNEL_SECRET`]?.trim() ?? "";
  const present = [botUserId, channelAccessToken, channelSecret].filter(Boolean).length;
  if (present === 0) return null;
  if (present !== 3) throw new Error(`${prefix} account configuration is incomplete`);
  if (!/^U[0-9a-f]{32}$/i.test(botUserId)) throw new Error(`${prefix}_BOT_USER_ID is invalid`);
  return { alias, botUserId, channelAccessToken, channelSecret };
}

export function getConfiguredLineAccounts(): LineAccountConfig[] {
  return (["primary", "secondary"] as const)
    .map(readAccount)
    .filter((account): account is LineAccountConfig => Boolean(account));
}

export function getLineAccountByAlias(alias: LineAccountAlias): LineAccountConfig {
  const account = readAccount(alias);
  if (!account) throw new Error(`LINE ${alias} account is not configured`);
  return account;
}

export function getLineAccountByBotUserId(botUserId: string): LineAccountConfig {
  const account = getConfiguredLineAccounts().find((candidate) => candidate.botUserId === botUserId);
  if (!account) throw new Error("LINE webhook destination is not configured");
  return account;
}

export function getActiveLineAccount(providerAccountId?: string): LineAccountConfig {
  if (providerAccountId) return getLineAccountByBotUserId(providerAccountId);
  return accountContext.getStore() ?? getLineAccountByAlias("primary");
}

export function getActiveMemberLiffUrl(next?: "orders"): string {
  return buildMemberLiffUrl(getActiveLineAccount().alias, next);
}

export function getMemberLiffUrlForBotUserId(
  botUserId: string,
  next?: "orders",
): string {
  return buildMemberLiffUrl(getLineAccountByBotUserId(botUserId).alias, next);
}

export function withLineAccount<T>(providerAccountId: string, operation: () => Promise<T>): Promise<T> {
  return accountContext.run(getLineAccountByBotUserId(providerAccountId), operation);
}

export function verifyLineWebhookSignature(input: {
  body: string;
  signature: string | null;
  destination: string;
}): boolean {
  if (!input.signature) return false;
  let account: LineAccountConfig;
  try {
    account = getLineAccountByBotUserId(input.destination);
  } catch {
    return false;
  }
  const expected = createHmac("sha256", account.channelSecret).update(input.body).digest("base64");
  const actualBuffer = Buffer.from(input.signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}
