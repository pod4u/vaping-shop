"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Layers, Loader2, RefreshCw, Star, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReviewStatus } from "@/lib/review-service";

interface ReviewRow {
  id: string;
  order_id: string;
  order_number: string;
  customer_id: number;
  customer_name: string;
  delivered_at: string | null;
  rating: number;
  category: string;
  review_text: string;
  status: ReviewStatus;
  rejection_reason: string | null;
  submitted_at: string;
  moderated_at: string | null;
  moderated_by: string | null;
  items: Array<{
    product_name: string;
    flavor_name: string;
    brand_name: string;
  }>;
}

type QueueFilter = ReviewStatus | "all";

const STATUS_META: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: "รอตรวจสอบ", className: "border-amber-300/30 bg-amber-300/10 text-amber-100" },
  approved: { label: "อนุมัติแล้ว", className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" },
  rejected: { label: "ปฏิเสธ", className: "border-red-400/30 bg-red-400/10 text-red-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  product: "สินค้า",
  delivery: "การจัดส่ง",
  service: "บริการ",
  overall: "ประสบการณ์โดยรวม",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function QueueCard({ icon: Icon, label, count, active, onClick }: { icon: typeof Clock; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-acid-lime bg-acid-lime/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`h-5 w-5 ${active ? "text-acid-lime" : "text-white/50"}`} />
        <span className="text-2xl font-black text-white">{count}</span>
      </div>
      <p className={`mt-3 text-sm font-bold ${active ? "text-acid-lime" : "text-white/70"}`}>{label}</p>
    </button>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews?status=${filter}&page_size=100`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดรีวิวไม่สำเร็จ");
      setReviews(result.reviews ?? []);
      setCounts(result.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดรีวิวไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleApprove = async (reviewId: string) => {
    if (!window.confirm("ยืนยันอนุมัติรีวิวนี้? ลูกค้าจะได้รับส่วนลด ฿5")) return;
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "อนุมัติไม่สำเร็จ");
      await loadReviews();
    } catch (approveError) {
      alert(approveError instanceof Error ? approveError.message : "อนุมัติไม่สำเร็จ");
    }
  };

  const handleReject = async (reviewId: string) => {
    const reason = prompt("กรุณาระบุเหตุผลในการปฏิเสธ (จะแสดงต่อลูกค้า):");
    if (!reason || !reason.trim()) return;
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "ปฏิเสธไม่สำเร็จ");
      await loadReviews();
    } catch (rejectError) {
      alert(rejectError instanceof Error ? rejectError.message : "ปฏิเสธไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">รีวิวจากลูกค้า</h1>
          <p className="mt-1 text-white/50">ตรวจสอบและอนุมัติรีวิวจากลูกค้าที่สั่งซื้อจริง</p>
        </div>
        <button type="button" aria-label="โหลดรีวิวใหม่" onClick={loadReviews} className="rounded-lg border border-white/10 p-2.5 text-white/60 hover:bg-white/5 hover:text-white">
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <Card className="border-sky-300/20 bg-sky-300/10">
        <CardContent className="py-4 text-sm text-sky-100">
          <strong>นโยบายการตรวจสอบ:</strong> ตรวจสอบว่ารีวิวเป็นการซื้อจริงและไม่เปิดเผยข้อมูลส่วนตัว<br />
          <span className="text-white/60">ห้ามปฏิเสธรีวิวเพียงเพราะคะแนนต่ำหรือมีข้อความวิจารณ์ ปฏิเสธได้เฉพาะสแปม เนื้อหาไม่เกี่ยวข้อง หรือข้อมูลที่เปิดเผยตัวตน</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QueueCard icon={Clock} label="รอตรวจสอบ" count={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <QueueCard icon={CheckCircle} label="อนุมัติแล้ว" count={counts.approved} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <QueueCard icon={XCircle} label="ปฏิเสธ" count={counts.rejected} active={filter === "rejected"} onClick={() => setFilter("rejected")} />
        <QueueCard icon={Layers} label="ทั้งหมด" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      {isLoading ? (
        <Card className="border-white/10 bg-white/5"><CardContent className="py-12 text-center text-white/50">กำลังโหลดรีวิว...</CardContent></Card>
      ) : reviews.length === 0 ? (
        <Card className="border-white/10 bg-white/5"><CardContent className="flex flex-col items-center py-14 text-center"><CheckCircle className="h-12 w-12 text-emerald-300/60" /><p className="mt-3 font-bold text-white">ไม่มีรีวิวในคิวนี้</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const meta = STATUS_META[review.status];
            return (
              <article key={review.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/60">{CATEGORY_LABELS[review.category] ?? review.category}</span>
                    </div>
                    <Link href={`/admin/orders/${review.order_id}`} className="mt-3 block break-all font-mono text-sm font-black text-acid-lime hover:underline">{review.order_number}</Link>
                    <p className="mt-1 text-xs text-white/40">ส่งรีวิว {formatDate(review.submitted_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{review.customer_name}</p>
                    {review.delivered_at && <p className="mt-1 text-xs text-white/40">ส่งถึง {formatDate(review.delivered_at)}</p>}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} className={`h-5 w-5 ${value <= review.rating ? "fill-amber-400 text-amber-400" : "text-white/30"}`} />
                  ))}
                </div>

                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-sm leading-6 text-white/80">{review.review_text}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {review.items.slice(0, 3).map((item, index) => (
                    <span key={index} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                      {item.brand_name} · {item.product_name}
                    </span>
                  ))}
                  {review.items.length > 3 && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                      +{review.items.length - 3} รายการ
                    </span>
                  )}
                </div>

                {review.status === "rejected" && review.rejection_reason && (
                  <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/5 p-3">
                    <p className="text-xs font-bold text-red-200">เหตุผลการปฏิเสธ:</p>
                    <p className="mt-1 text-sm text-white/60">{review.rejection_reason}</p>
                  </div>
                )}

                {review.moderated_at && (
                  <p className="mt-3 text-xs text-white/35">ตรวจสอบโดย {review.moderated_by} เมื่อ {formatDate(review.moderated_at)}</p>
                )}

                {review.status === "pending" && (
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(review.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-acid-lime px-4 py-2.5 text-sm font-bold text-navy-deep hover:brightness-110"
                    >
                      <CheckCircle className="h-4 w-4" />
                      อนุมัติ + ฿5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(review.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-400/10"
                    >
                      <XCircle className="h-4 w-4" />
                      ปฏิเสธ
                    </button>
                  </div>
                )}

                {review.status === "rejected" && (
                  <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4">
                    <p className="text-sm font-bold text-amber-200">รอลูกค้าแก้ไขและส่งรีวิวใหม่</p>
                    <p className="mt-1 text-xs text-white/50">ลูกค้าจะเห็นเหตุผลการปฏิเสธและสามารถแก้ไขรีวิวได้ เมื่อส่งใหม่รีวิวจะกลับมาอยู่ในสถานะรอตรวจสอบค่ะ</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}