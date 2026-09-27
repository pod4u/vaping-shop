"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, Send, UserRound } from "lucide-react";

type Conversation = {
  id: string;
  participant_id: string;
  display_name: string | null;
  profile_picture_url: string | null;
  status: "open" | "resolved";
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  message_text: string | null;
  automation_key: string | null;
  created_at: string;
};

type MessengerStatus = {
  appConfigured: boolean;
  webhookConfigured: boolean;
  pageConnected: boolean;
};

function timeLabel(value: string) {
  return new Date(value).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function FacebookInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<MessengerStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/admin/facebook", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดข้อความไม่สำเร็จ");
    setConversations(result.conversations || []);
    setStatus(result.status);
    setSelectedId((current) => current || result.conversations?.[0]?.id || null);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(`/api/admin/facebook?conversationId=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดบทสนทนาไม่สำเร็จ");
    setSelected(result.conversation);
    setMessages(result.messages || []);
  }, []);

  useEffect(() => {
    loadConversations().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ")).finally(() => setLoading(false));
    const timer = window.setInterval(() => loadConversations().catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดบทสนทนาไม่สำเร็จ"));
  }, [loadMessages, selectedId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, text: draft.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ส่งข้อความไม่สำเร็จ");
      setDraft("");
      await Promise.all([loadMessages(selectedId), loadConversations()]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-acid-lime">Facebook Page</p>
          <h1 className="mt-1 text-3xl font-black text-white">กล่องข้อความ Messenger</h1>
          <p className="mt-1 text-sm text-white/50">ดูข้อความที่ระบบรับ ตอบลูกค้า และตรวจว่าข้อความใดตอบอัตโนมัติแล้ว</p>
        </div>
        <button onClick={() => loadConversations().catch(() => undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" />รีเฟรช
        </button>
      </div>

      {status && (
        <div className="flex flex-wrap gap-2">
          {[
            [status.appConfigured, "Meta App"],
            [status.webhookConfigured, "Webhook"],
            [status.pageConnected, "เพจร้าน"],
          ].map(([ready, label]) => (
            <span key={String(label)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${ready ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
              {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-amber-300" />}{label}: {ready ? "พร้อม" : "รอตั้งค่า"}
            </span>
          ))}
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid min-h-[650px] overflow-hidden rounded-[28px] border border-white/10 bg-[#071328]/80 shadow-2xl shadow-black/20 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/10 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><MessageCircle className="h-4 w-4 text-acid-lime" />บทสนทนาล่าสุด</div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลด</div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm leading-6 text-white/40">ยังไม่มีข้อความจาก Facebook<br />เมื่อเชื่อมเพจแล้ว ข้อความใหม่จะขึ้นที่นี่</div>
            ) : conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === conversation.id ? "bg-acid-lime/10 ring-1 ring-acid-lime/30" : "hover:bg-white/5"}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {conversation.profile_picture_url ? <img src={conversation.profile_picture_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-white/40" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white">{conversation.display_name || "ลูกค้า Facebook"}</p>
                    {conversation.unread_count > 0 && <span className="min-w-5 rounded-full bg-acid-lime px-1.5 py-0.5 text-center text-[10px] font-black text-brand-void">{conversation.unread_count}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/45">{conversation.last_message_preview || "ข้อความใหม่"}</p>
                  <p className="mt-1 text-[10px] text-white/30">{timeLabel(conversation.last_message_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[540px] flex-col">
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {selected.profile_picture_url ? <img src={selected.profile_picture_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-white/40" />}
                </div>
                <div><p className="font-bold text-white">{selected.display_name || "ลูกค้า Facebook"}</p><p className="text-xs text-white/40">Messenger · ระบบกันข้อความตอบซ้ำเปิดอยู่</p></div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(20,73,128,0.25),_transparent_55%)] p-4 sm:p-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.direction === "outbound" ? "rounded-br-md bg-acid-lime text-brand-void" : "rounded-bl-md border border-white/10 bg-white/[0.07] text-white/85"}`}>
                      <p className="whitespace-pre-wrap">{message.message_text || (message.message_type === "image" ? "📷 รูปภาพ" : "📎 ไฟล์แนบ")}</p>
                      <div className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${message.direction === "outbound" ? "text-brand-void/55" : "text-white/35"}`}>
                        {message.automation_key && <span>ตอบอัตโนมัติ</span>}{timeLabel(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} placeholder="พิมพ์ข้อความตอบลูกค้า..." className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-acid-lime/50" />
                  <button disabled={sending || !draft.trim()} className="inline-flex min-w-[52px] items-center justify-center rounded-2xl bg-acid-lime text-brand-void disabled:cursor-not-allowed disabled:opacity-40">
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-white/40"><MessageCircle className="h-10 w-10" /><p>เลือกบทสนทนาเพื่ออ่านและตอบลูกค้า</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
