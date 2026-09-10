import { NextResponse } from "next/server";

const gone = () => NextResponse.json(
  {
    success: false,
    error: "Consent is recorded atomically during customer registration.",
  },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

export const GET = gone;
export const POST = gone;
