import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession, publicAdminSession } from "@/lib/admin-auth";
import { roleHasPermission } from "@/lib/admin-permissions";
import {
  getAdminReviewDetail,
  approveOrderReview,
  rejectOrderReview,
} from "@/lib/review-service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { reviewId } = await context.params;

  const session = await getAdminSession(cookies().get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!roleHasPermission(session.role, "reviews.moderate")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const review = await getAdminReviewDetail(reviewId);

    if (!review) {
      return NextResponse.json({ error: "review_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      review,
      session: publicAdminSession(session),
    });
  } catch (error) {
    console.error("Error fetching review detail:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { reviewId } = await context.params;

  const session = await getAdminSession(cookies().get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!roleHasPermission(session.role, "reviews.moderate")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { action, rejectionReason } = body as Record<string, unknown>;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  if (action === "reject") {
    if (typeof rejectionReason !== "string" || (rejectionReason as string).trim().length === 0) {
      return NextResponse.json({ error: "rejection_reason_required", message: "กรุณาระบุเหตุผลในการปฏิเสธ" }, { status: 400 });
    }
    if ((rejectionReason as string).trim().length > 500) {
      return NextResponse.json({ error: "rejection_reason_too_long", message: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" }, { status: 400 });
    }
  }

  try {
    if (action === "approve") {
      const result = await approveOrderReview(reviewId, session.accountId);

      return NextResponse.json({
        success: true,
        reviewId: result.reviewId,
        creditId: result.creditId,
        idempotentReplay: result.idempotentReplay,
        message: "อนุมัติรีวิวและออกส่วนลด ฿5 เรียบร้อยแล้ว",
      });
    } else {
      const result = await rejectOrderReview(reviewId, session.accountId, (rejectionReason as string).trim());

      return NextResponse.json({
        success: true,
        reviewId: result.reviewId,
        idempotentReplay: result.idempotentReplay,
        message: "ปฏิเสธรีวิวเรียบร้อยแล้ว ลูกค้าสามารถแก้ไขและส่งใหม่ได้",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (message === "review_not_found") {
      return NextResponse.json({ error: "review_not_found", message: "ไม่พบรีวิว" }, { status: 404 });
    }

    if (message.includes("only pending")) {
      return NextResponse.json({ error: "invalid_status", message: "สามารถดำเนินการได้เฉพาะรีวิวที่รอตรวจสอบ" }, { status: 400 });
    }

    console.error("Error moderating review:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}