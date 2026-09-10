// LINE Messaging API Client
// ฟังก์ชันสำหรับส่งข้อความผ่าน LINE API

function getChannelAccessToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  return token;
}

let cachedBotUserId: string | null = null;

export async function getLineBotUserId(): Promise<string> {
  const configured = process.env.LINE_BOT_USER_ID?.trim();
  if (configured) {
    if (!/^U[0-9a-f]{32}$/i.test(configured)) {
      throw new Error('Invalid LINE_BOT_USER_ID');
    }
    return configured;
  }
  if (cachedBotUserId) return cachedBotUserId;

  const response = await fetch('https://api.line.me/v2/bot/info', {
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to resolve LINE bot identity');

  const body = await response.json() as { userId?: unknown };
  if (typeof body.userId !== 'string' || !/^U[0-9a-f]{32}$/i.test(body.userId)) {
    throw new Error('LINE bot identity response was invalid');
  }
  cachedBotUserId = body.userId;
  return body.userId;
}

// Send reply to LINE
export async function sendReply(replyToken: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getChannelAccessToken()}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [message]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE API error:', error);
    }
  } catch (error) {
    console.error('Failed to send reply:', error);
  }
}

// Push message to user
export async function pushMessage(userId: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getChannelAccessToken()}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [message]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to push message:', error);
    return false;
  }
}

export async function getLineMessageContent(messageId: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(messageId)) {
    throw new Error('Invalid LINE message ID');
  }

  const response = await fetch(
    `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    {
      headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error('Unable to download LINE message content');

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  if (!supportedTypes.has(contentType)) throw new Error('Unsupported LINE image type');

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > 4_194_304) throw new Error('LINE image is too large');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 1 || bytes.byteLength > 4_194_304) {
    throw new Error('LINE image is too large');
  }
  return { bytes, contentType };
}

// Broadcast to all users
export async function broadcastMessage(message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getChannelAccessToken()}`
      },
      body: JSON.stringify({
        messages: [message]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to broadcast:', error);
    return false;
  }
}
