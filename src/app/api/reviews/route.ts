import { NextResponse } from "next/server";
import { getPublicReviews, type ReviewCategory } from "@/lib/review-service";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: Array<ReviewCategory | "all"> = ["all", "product", "delivery", "service", "overall"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") as ReviewCategory | "all") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10)));

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  try {
    const result = await getPublicReviews(category, page, pageSize);

    return NextResponse.json({
      reviews: result.reviews,
      summary: result.summary,
      total: result.total,
      page,
      pageSize,
    }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching public reviews:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}