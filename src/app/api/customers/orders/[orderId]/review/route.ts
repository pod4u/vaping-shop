import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import {
  submitOrderReview,
  updateRejectedReview,
  getOrderReview,
  type ReviewCategory,
} from "@/lib/review-service";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: ReviewCategory[] = ["product", "delivery", "service", "overall"];

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;

  const session = verifyMemberSessionToken(cookies().get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const review = await getOrderReview(orderId);

    if (!review) {
      return NextResponse.json({ review: null });
    }

    // Verify ownership
    if (review.customer_id !== session.customerId) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;

  const session = verifyMemberSessionToken(cookies().get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const { rating, category, reviewText } = body as Record<string, unknown>;

  // Validate rating
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating", message: "คะแนนต้องอยู่ระหว่าง 1 ถึง 5" }, { status: 400 });
  }

  // Validate category
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as ReviewCategory)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  // Validate review text
  if (typeof reviewText !== "string") {
    return NextResponse.json({ error: "invalid_review_text" }, { status: 400 });
  }

  const trimmedText = reviewText.trim();
  if (trimmedText.length < 10) {
    return NextResponse.json({ error: "review_too_short", message: "รีวิวต้องมีอย่างน้อย 10 ตัวอักษร" }, { status: 400 });
  }
  if (trimmedText.length > 2000) {
    return NextResponse.json({ error: "review_too_long", message: "รีวิวต้องไม่เกิน 2000 ตัวอักษร" }, { status: 400 });
  }

  try {
    const result = await submitOrderReview(
      orderId,
      session.customerId,
      rating,
      category as ReviewCategory,
      trimmedText,
    );

    return NextResponse.json({
      success: true,
      reviewId: result.reviewId,
      status: result.status,
      idempotentReplay: result.idempotentReplay,
      message: "ส่งรีวิวเรียบร้อยแล้ว รอการตรวจสอบก่อนเผยแพร่ค่ะ",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (message === "order_not_found") {
      return NextResponse.json({ error: "order_not_found", message: "ไม่พบออเดอร์" }, { status: 404 });
    }

    if (message === "not_authorized") {
      return NextResponse.json({ error: "not_authorized", message: "คุณไม่มีสิทธิ์รีวิวออเดอร์นี้" }, { status: 403 });
    }

    if (message.includes("cancelled orders cannot be reviewed")) {
      return NextResponse.json({ error: "order_cancelled", message: "ออเดอร์ที่ยกเลิกแล้วไม่สามารถส่งรีวิวได้ค่ะ" }, { status: 400 });
    }

    console.error("Error submitting review:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orderId } = await context.params;

  const session = verifyMemberSessionToken(cookies().get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const { rating, category, reviewText } = body as Record<string, unknown>;

  // Validate rating
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating", message: "คะแนนต้องอยู่ระหว่าง 1 ถึง 5" }, { status: 400 });
  }

  // Validate category
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as ReviewCategory)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  // Validate review text
  if (typeof reviewText !== "string") {
    return NextResponse.json({ error: "invalid_review_text" }, { status: 400 });
  }

  const trimmedText = reviewText.trim();
  if (trimmedText.length < 10) {
    return NextResponse.json({ error: "review_too_short", message: "รีวิวต้องมีอย่างน้อย 10 ตัวอักษร" }, { status: 400 });
  }
  if (trimmedText.length > 2000) {
    return NextResponse.json({ error: "review_too_long", message: "รีวิวต้องไม่เกิน 2000 ตัวอักษร" }, { status: 400 });
  }

  try {
    const result = await updateRejectedReview(
      orderId,
      session.customerId,
      rating,
      category as ReviewCategory,
      trimmedText,
    );

    return NextResponse.json({
      success: true,
      reviewId: result.reviewId,
      status: result.status,
      message: "ส่งรีวิวใหม่เรียบร้อยแล้ว รอการตรวจสอบอีกครั้งค่ะ",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (message === "review_not_found") {
      return NextResponse.json({ error: "review_not_found", message: "ไม่พบรีวิว" }, { status: 404 });
    }

    if (message === "not_authorized") {
      return NextResponse.json({ error: "not_authorized", message: "คุณไม่มีสิทธิ์แก้ไขรีวิวนี้" }, { status: 403 });
    }

    if (message.includes("only rejected reviews can be updated")) {
      return NextResponse.json({ error: "not_rejected", message: "สามารถแก้ไขได้เฉพาะรีวิวที่ถูกปฏิเสธ" }, { status: 400 });
    }

    console.error("Error updating review:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
