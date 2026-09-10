import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession, publicAdminSession } from "@/lib/admin-auth";
import { roleHasPermission } from "@/lib/admin-permissions";
import { getAdminReviewQueue, type ReviewStatus } from "@/lib/review-service";
import { validatePagination } from "@/lib/pagination-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSession(cookies().get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!roleHasPermission(session.role, "reviews.moderate")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as ReviewStatus | "all") ?? "pending";

  // Validate pagination parameters
  const { page, pageSize } = validatePagination(
    searchParams.get("page"),
    searchParams.get("page_size"),
  );

  const validStatuses: Array<ReviewStatus | "all"> = ["all", "pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const result = await getAdminReviewQueue(status, page, pageSize);

    return NextResponse.json({
      reviews: result.reviews,
      total: result.total,
      counts: result.counts,
      page,
      pageSize,
      session: publicAdminSession(session),
    });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}