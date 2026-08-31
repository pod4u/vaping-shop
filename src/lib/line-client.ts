// LINE Messaging API Client
// ฟังก์ชันสำหรับส่งข้อความผ่าน LINE API

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// Send reply to LINE
export async function sendReply(replyToken: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
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
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
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

// Broadcast to all users
export async function broadcastMessage(message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
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