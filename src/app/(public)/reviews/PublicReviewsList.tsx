"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  UsersRound,
} from "lucide-react";

export type ReviewCategory = "product" | "delivery" | "service" | "overall";

export interface PublicReview {
  id: string;
  rating: number;
  category: ReviewCategory;
  review_text: string;
  published_at: string;
  masked_order_number: string;
  masked_customer_name: string;
  verification_status: "member_order" | "payment_confirmed" | "shipped" | "delivered";
  items: Array<{ product_name: string; flavor_name: string; brand_name: string }>;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

const CATEGORIES = [
  { value: "all", label: "ทั้งหมด" },
  { value: "product", label: "สินค้า" },
  { value: "delivery", label: "การจัดส่ง" },
  { value: "service", label: "การใช้งาน" },
  { value: "overall", label: "บริการ" },
] as const;

const CATEGORY_LABELS: Record<ReviewCategory, string> = {
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
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function reviewInitial(name: string) {
  return name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 1).toUpperCase() || "P";
}

function ReviewStars({ rating, size = "small" }: { rating: number; size?: "small" | "large" }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${rating} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${size === "large" ? "h-6 w-6 sm:h-7 sm:w-7" : "h-4 w-4"} ${
            value <= Math.round(rating) ? "fill-acid-lime text-acid-lime" : "fill-transparent text-white/20"
          }`}
        />
      ))}
    </span>
  );
}

interface PublicReviewsListProps {
  previewData?: {
    reviews: PublicReview[];
    summary: ReviewSummary;
  };
}

export default function PublicReviewsList({ previewData }: PublicReviewsListProps = {}) {
  const [reviews, setReviews] = useState<PublicReview[]>(previewData?.reviews ?? []);
  const [summary, setSummary] = useState<ReviewSummary | null>(previewData?.summary ?? null);
  const [category, setCategory] = useState<"all" | ReviewCategory>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(previewData?.reviews.length ?? 0);
  const [isLoading, setIsLoading] = useState(!previewData);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    if (previewData) {
      const filtered = category === "all"
        ? previewData.reviews
        : previewData.reviews.filter((review) => review.category === category);
      setReviews(filtered);
      setSummary(previewData.summary);
      setTotal(filtered.length);
      setIsLoading(false);
      return;
    }

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
  }, [category, page, previewData]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);
  useEffect(() => { setPage(1); }, [category]);

  const totalPages = Math.ceil(total / 20);
  const hasReviews = Boolean(summary && summary.total_reviews > 0);

  return (
    <section className="mt-5 sm:mt-7" aria-label="รายการรีวิวจากลูกค้า">
      <div className="mt-7 overflow-hidden rounded-[1.6rem] border border-sky-300/25 bg-[#081b38]/80 shadow-xl shadow-black/20">
        <div className="grid grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-center border-r border-white/10 p-5 sm:p-8">
            <div className="flex items-end gap-3">
              <strong className="text-5xl font-black tracking-tighter sm:text-7xl">
                {hasReviews ? summary!.average_rating.toFixed(1) : "—"}
              </strong>
              <span className="pb-2 text-sm font-bold text-slate-400">/ 5</span>
            </div>
            <div className="mt-3 origin-left scale-75 sm:scale-100"><ReviewStars rating={summary?.average_rating ?? 0} size="large" /></div>
            <p className="mt-2 text-xs font-black leading-5 text-white sm:mt-3 sm:text-sm">
              {hasReviews ? `${summary!.total_reviews.toLocaleString("th-TH")} รีวิวจากคำสั่งซื้อจริง` : "รอรีวิวจากคำสั่งซื้อจริงรายการแรก"}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-slate-400 sm:block">ระบบไม่นำรีวิวที่ยังไม่ผ่านการตรวจสอบมาแสดงค่ะ</p>
          </div>

          <div className="grid content-center gap-3 p-4 sm:p-8">
            <div className="flex gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300 sm:h-10 sm:w-10"><BadgeCheck className="h-5 w-5" /></span>
              <div><p className="text-xs font-black sm:text-base">ผู้ซื้อที่ยืนยันแล้ว</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400 sm:text-xs sm:leading-5">ทุกรีวิวเชื่อมกับคำสั่งซื้อจริง</p></div>
            </div>
            <div className="flex gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300 sm:h-10 sm:w-10"><ShoppingBag className="h-5 w-5" /></span>
              <div><p className="text-xs font-black sm:text-base">รีวิวเชื่อมกับออเดอร์</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400 sm:text-xs sm:leading-5">ตรวจสอบย้อนกลับได้ทุกรายการ</p></div>
            </div>
            <div className="flex gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300 sm:h-10 sm:w-10"><UsersRound className="h-5 w-5" /></span>
              <div><p className="text-xs font-black sm:text-base">ประสบการณ์จริงจากลูกค้า</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400 sm:text-xs sm:leading-5">เพื่อพัฒนาบริการให้ดียิ่งขึ้น</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="กรองรีวิวตามหมวดหมู่">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value as typeof category)}
            aria-pressed={category === item.value}
            className={`inline-flex min-h-12 basis-[calc(33.333%-0.375rem)] grow items-center justify-center rounded-[1.25rem] border px-3 py-2.5 text-sm font-black transition sm:basis-0 ${
              category === item.value
                ? "border-acid-lime bg-acid-lime text-navy-deep shadow-lg shadow-acid-lime/10"
                : "border-white/10 bg-[#0a1931]/70 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error} <button type="button" onClick={() => void loadReviews()} className="ml-2 font-black underline">ลองใหม่</button>
        </div>
      )}

      {isLoading ? (
        <div className="mt-5 flex min-h-52 items-center justify-center rounded-[2rem] border border-white/10 bg-[#0a1931]/60">
          <Loader2 className="h-8 w-8 animate-spin text-acid-lime" aria-label="กำลังโหลดรีวิว" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 rounded-[2rem] border border-white/10 bg-[#0a1931]/70 px-6 py-12 text-center shadow-lg">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-acid-lime/20 bg-acid-lime/[0.08] text-acid-lime"><ShieldCheck className="h-8 w-8" /></span>
          <h2 className="mt-5 text-xl font-black">{category === "all" ? "ยังไม่มีรีวิวที่เผยแพร่" : "ยังไม่มีรีวิวในหมวดนี้"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">รีวิวจากสมาชิกจะปรากฏที่นี่หลังผ่านการตรวจสอบจากแอดมิน โดยไม่มีการสร้างข้อความรีวิวขึ้นเองค่ะ</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {reviews.map((review) => {
            const primaryItem = review.items[0];
            return (
              <article key={review.id} className="rounded-[1.6rem] border border-sky-300/20 bg-[linear-gradient(145deg,rgba(12,34,66,0.96),rgba(7,22,45,0.96))] p-5 shadow-lg shadow-black/15 sm:p-7">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-200/15 bg-gradient-to-br from-sky-300/35 to-blue-600/20 text-lg font-black text-white">
                    {reviewInitial(review.masked_customer_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black">{review.masked_customer_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2"><ReviewStars rating={review.rating} /><span className="text-xs text-slate-400">{formatDate(review.published_at)}</span></div>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-acid-lime/25 bg-acid-lime/[0.08] px-2.5 py-1 text-xs font-black text-acid-lime">
                        <BadgeCheck className="h-3.5 w-3.5" /> ผู้ซื้อที่ยืนยันแล้ว
                      </span>
                    </div>

                    {primaryItem && (
                      <p className="mt-4 text-sm font-bold text-sky-200">
                        {primaryItem.brand_name} · {primaryItem.product_name}{primaryItem.flavor_name ? ` · ${primaryItem.flavor_name}` : ""}
                      </p>
                    )}
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-100">“{review.review_text}”</p>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
                      <span className="text-slate-500">คำสั่งซื้อ {review.masked_order_number}</span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-300"><BadgeCheck className="h-3.5 w-3.5 text-acid-lime" />{VERIFICATION_LABELS[review.verification_status]}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">{CATEGORY_LABELS[review.category]}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="หน้ารายการรีวิว">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white disabled:opacity-30" aria-label="หน้าก่อนหน้า"><ChevronLeft className="h-5 w-5" /></button>
          <span className="text-sm font-bold text-slate-400">หน้า {page} จาก {totalPages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white disabled:opacity-30" aria-label="หน้าถัดไป"><ChevronRight className="h-5 w-5" /></button>
        </nav>
      )}
    </section>
  );
}
