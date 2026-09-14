import "server-only";

const TELEGRAM_API_ROOT = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 10_000;

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: { chat?: TelegramChat };
  edited_message?: { chat?: TelegramChat };
  channel_post?: { chat?: TelegramChat };
  edited_channel_post?: { chat?: TelegramChat };
  my_chat_member?: { chat?: TelegramChat };
  chat_member?: { chat?: TelegramChat };
};

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramChatCandidate {
  id: string;
  title: string;
  type: TelegramChat["type"];
}

export class TelegramApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramApiError";
  }
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new TelegramApiError("ยังไม่ได้ตั้งค่า Telegram Bot Token");
  return token;
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_API_ROOT}/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const result = await response.json().catch(() => null) as TelegramResponse<T> | null;
  if (!response.ok || !result?.ok || result.result === undefined) {
    throw new TelegramApiError(result?.description || `Telegram API error (${response.status})`);
  }
  return result.result;
}

function chatTitle(chat: TelegramChat): string {
  if (chat.title?.trim()) return chat.title.trim();
  const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (chat.username) return `@${chat.username}`;
  return `Telegram ${chat.id}`;
}

export function isTelegramTokenConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function discoverTelegramChats(): Promise<TelegramChatCandidate[]> {
  const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
    limit: 100,
    timeout: 0,
    allowed_updates: ["message", "edited_message", "channel_post", "my_chat_member", "chat_member"],
  });
  const chats = new Map<string, TelegramChatCandidate>();
  for (const update of updates) {
    const chat = update.message?.chat
      || update.edited_message?.chat
      || update.channel_post?.chat
      || update.edited_channel_post?.chat
      || update.my_chat_member?.chat
      || update.chat_member?.chat;
    if (!chat || !["private", "group", "supergroup", "channel"].includes(chat.type)) continue;
    chats.set(String(chat.id), { id: String(chat.id), title: chatTitle(chat), type: chat.type });
  }
  return [...chats.values()];
}

export async function verifyTelegramChat(chatId: string): Promise<TelegramChatCandidate> {
  const chat = await telegramRequest<TelegramChat>("getChat", { chat_id: chatId });
  return { id: String(chat.id), title: chatTitle(chat), type: chat.type };
}

export async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  button?: { label: string; url: string };
}): Promise<{ messageId: number }> {
  const result = await telegramRequest<{ message_id: number }>("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(input.button ? {
      reply_markup: { inline_keyboard: [[{ text: input.button.label, url: input.button.url }]] },
    } : {}),
  });
  return { messageId: result.message_id };
}

export async function deleteTelegramMessage(chatId: string, messageId: number): Promise<void> {
  await telegramRequest<boolean>("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}
