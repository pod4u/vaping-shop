"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, CheckCircle, AlertCircle, Edit } from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected";

interface Review {
  id: string;
  rating: number;
  category: "product" | "delivery" | "service" | "overall";
  review_text: string;
  status: ReviewStatus;
  rejection_reason: string | null;
}

interface MemberReviewFormProps {
  orderId: string;
  orderNumber: string;
  existingReview?: Review | null;
}

const CATEGORIES = [
  { value: "overall", label: "ประสบการณ์โดยรวม" },
  { value: "product", label: "สินค้า" },
  { value: "delivery", label: "การจัดส่ง" },
  { value: "service", label: "บริการและการใช้งานระบบ" },
] as const;

export default function MemberReviewForm({
  orderId,
  orderNumber,
  existingReview,
}: MemberReviewFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [category, setCategory] = useState(existingReview?.category ?? "overall");
  const [reviewText, setReviewText] = useState(existingReview?.review_text ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const isRejected = existingReview?.status === "rejected";

  // After submission, show pending status immediately (prevents duplicate submission)
  const showPendingStatus = justSubmitted || existingReview?.status === "pending";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const trimmedText = reviewText.trim();
    if (trimmedText.length < 10) {
      setError("รีวิวต้องมีอย่างน้อย 10 ตัวอักษร");
      setIsSubmitting(false);
      return;
    }

    try {
      const method = isRejected ? "PATCH" : "POST";
      const response = await fetch(`/api/customers/orders/${orderId}/review`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          category,
          reviewText: trimmedText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setIsSubmitting(false);
        return;
      }

      // Close modal immediately
      setIsOpen(false);
      // Show pending status right away (prevents duplicate submission)
      setJustSubmitted(true);
      // Refresh the member dashboard to show updated review status
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {existingReview?.status === "approved" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-medium text-emerald-200">รีวิวได้รับการเผยแพร่แล้ว</span>
        </div>
      )}

      {showPendingStatus && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
          <span className="text-sm font-medium text-sky-200">ส่งรีวิวแล้ว · รอตรวจสอบ</span>
        </div>
      )}

      {existingReview?.status === "rejected" && !justSubmitted && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-left transition-colors hover:bg-amber-300/20"
        >
          <Edit className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-medium text-amber-200">กรุณาแก้ไขรีวิว</span>
        </button>
      )}

      {!existingReview && !justSubmitted && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-acid-lime/40 px-4 py-2 text-sm font-bold text-acid-lime transition-colors hover:bg-acid-lime/10"
        >
          <Star className="h-4 w-4" />
          รีวิวเพื่อรับส่วนลด ฿5
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-navy-border bg-navy-deep p-6">
            <h2 className="text-xl font-black text-white">รีวิวออเดอร์นี้</h2>
            <p className="mt-1 text-sm text-white/50">เลขที่ {orderNumber}</p>

            <div className="mt-4 rounded-lg border border-acid-lime/30 bg-acid-lime/5 px-4 py-3">
              <p className="text-sm text-acid-lime">
                รีวิวประสบการณ์สั่งซื้อหรือการใช้งานระบบ รับส่วนลด ฿5 สำหรับออเดอร์ถัดไปค่ะ
              </p>
              <p className="mt-1 text-xs text-white/50">
                รีวิวจะผ่านการตรวจสอบว่าเป็นการซื้อจริงและไม่เปิดเผยข้อมูลส่วนตัวก่อนเผยแพร่ค่ะ
              </p>
            </div>

            {isRejected && existingReview.rejection_reason && (
              <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-bold text-amber-200">กรุณาแก้ไขรีวิว</p>
                    <p className="mt-1 text-xs text-white/60">{existingReview.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-white">คะแนน</label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          value <= rating ? "fill-amber-400 text-amber-400" : "text-white/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-white">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-navy-deep px-4 py-3 text-white outline-none focus:border-acid-lime"
                >
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-white">รีวิว</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  placeholder="แบ่งปันประสบการณ์ของคุณ..."
                  className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-navy-deep px-4 py-3 text-white placeholder-white/40 outline-none focus:border-acid-lime"
                />
                <p className="mt-1 text-xs text-white/40">
                  {reviewText.trim().length} / 2000 ตัวอักษร (ขั้นต่ำ 10 ตัว)
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-white/15 px-4 py-3 font-bold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || reviewText.trim().length < 10}
                  className="flex-1 rounded-lg bg-acid-lime px-4 py-3 font-bold text-navy-deep transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังส่ง...
                    </span>
                  ) : (
                    "ส่งรีวิว"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
