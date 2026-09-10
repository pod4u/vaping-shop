"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Loader2, Package, Truck, Headphones, Sparkles, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";

type ReviewCategory = "product" | "delivery" | "service" | "overall";

interface PublicReview {
  id: string;
  rating: number;
  category: ReviewCategory;
  review_text: string;
  published_at: string;
  masked_order_number: string;
  masked_customer_name: string;
  verification_status: "member_order" | "payment_confirmed" | "shipped" | "delivered";
  items: Array<{
    product_name: string;
    flavor_name: string;
    brand_name: string;
  }>;
}

interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

const CATEGORIES = [
  { value: "all", label: "ทั้งหมด", icon: Sparkles },
  { value: "overall", label: "ภาพรวม", icon: Star },
  { value: "product", label: "สินค้า", icon: Package },
  { value: "delivery", label: "การจัดส่ง", icon: Truck },
  { value: "service", label: "บริการและระบบ", icon: Headphones },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  product: "สินค้า",
  delivery: "การจัดส่ง",
  service: "บริการและการใช้งานระบบ",
  overall: "ประสบการณ์โดยรวม",
};

const VERIFICATION_LABELS: Record<PublicReview["verification_status"], string> = {
  member_order: "มีออเดอร์ในระบบ",
  payment_confirmed: "ยืนยันการชำระแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "จัดส่งสำเร็จแล้ว",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

export default function PublicReviewsList() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [category, setCategory] = useState<"all" | ReviewCategory>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/reviews?category=${category}&page=${page}&page_size=20`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดรีวิวไม่สำเร็จ");
      setReviews(result.reviews ?? []);
      setSummary(result.summary ?? null);
      setTotal(result.total ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดรีวิวไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [category]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="mt-8">
      {summary && summary.total_reviews > 0 && (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white">{summary.average_rating.toFixed(1)}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-5 w-5 ${
                        value <= Math.round(summary.average_rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm text-white/50">
                {summary.total_reviews.toLocaleString("th-TH")} รีวิว
              </p>
            </div>
            <div className="flex flex-col-reverse gap-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = summary.rating_distribution[rating as 1 | 2 | 3 | 4 | 5];
                const percentage = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-3 text-right text-xs text-white/50">{rating}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-white/40">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="กรองรีวิวตามหมวดหมู่">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value as typeof category)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${
              category === item.value
                ? "border-acid-lime bg-acid-lime text-navy-deep"
                : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Star className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 font-bold text-white">ยังไม่มีรีวิว</p>
          <p className="mt-1 text-sm text-white/50">รีวิวที่ผ่านการตรวจสอบจากแอดมินจะแสดงที่นี่ค่ะ</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-5 transition-colors hover:border-acid-lime/25"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{review.masked_customer_name}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {formatDate(review.published_at)} · {review.masked_order_number}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-4 w-4 ${
                        value <= review.rating ? "fill-amber-400 text-amber-400" : "text-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-acid-lime/25 bg-acid-lime/[0.08] px-2.5 py-1 text-xs font-bold text-acid-lime">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {VERIFICATION_LABELS[review.verification_status]}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55">
                  {CATEGORY_LABELS[review.category] ?? review.category}
                </span>
                {review.items.slice(0, 2).map((item, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50"
                  >
                    {item.brand_name} · {item.product_name}
                  </span>
                ))}
              </div>

              <p className="mt-4 flex-1 text-sm leading-7 text-white/80">{review.review_text}</p>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 disabled:opacity-30" aria-label="หน้าก่อนหน้า">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-white/60">หน้า {page} จาก {totalPages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 disabled:opacity-30" aria-label="หน้าถัดไป">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
