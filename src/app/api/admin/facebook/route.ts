import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import {
  getFacebookConversation,
  getFacebookMessengerStatus,
  listFacebookConversations,
  listFacebookMessages,
  sendFacebookTextMessage,
} from "@/lib/facebook-messenger";
import { requireSameOrigin } from "@/lib/warehouse-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "customers.view");
  if (unauthorized) return unauthorized;
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId")?.trim() || "";
    if (conversationId) {
      if (!uuidPattern.test(conversationId)) return NextResponse.json({ success: false, error: "รหัสบทสนทนาไม่ถูกต้อง" }, { status: 400 });
      const [conversation, messages] = await Promise.all([
        getFacebookConversation(conversationId),
        listFacebookMessages(conversationId),
      ]);
      return NextResponse.json({ success: true, conversation, messages }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      success: true,
      status: getFacebookMessengerStatus(),
      conversations: await listFacebookConversations(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "โหลดกล่องข้อความ Facebook ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const unauthorized = await requireAdminApiPermission(request, "customers.manage");
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as Record<string, unknown>;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!uuidPattern.test(conversationId)) return NextResponse.json({ success: false, error: "รหัสบทสนทนาไม่ถูกต้อง" }, { status: 400 });
    if (!text || text.length > 2000) return NextResponse.json({ success: false, error: "ข้อความต้องมี 1–2,000 ตัวอักษร" }, { status: 400 });
    const conversation = await getFacebookConversation(conversationId);
    await sendFacebookTextMessage({ participantId: conversation.participant_id, conversationId, text });
    return NextResponse.json({ success: true, message: "ส่งข้อความแล้ว" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "ส่งข้อความ Facebook ไม่สำเร็จ" }, { status: 502 });
  }
}
