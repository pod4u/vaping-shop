import { NextRequest, NextResponse } from "next/server";

const REVIEW_DESIGN_COOKIE = "pod4u_review_design_preview";
const REVIEW_DESIGN_KEY = "5b312c3a38459608acead0cd4dba4a4a";

export async function GET(request: NextRequest) {
  const destination = new URL("/reviews", request.url);
  const response = NextResponse.redirect(destination);

  if (request.nextUrl.searchParams.get("off") === "1") {
    response.cookies.set(REVIEW_DESIGN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (request.nextUrl.searchParams.get("key") !== REVIEW_DESIGN_KEY) {
    return NextResponse.redirect(new URL("/reviews", request.url));
  }

  response.cookies.set(REVIEW_DESIGN_COOKIE, "enabled", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
