import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCanonical } from "@/lib/seo";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
  description: "สมัครสมาชิก Pod4U รับสิทธิพิเศษและข่าวสารโปรโมชั่น",
  alternates: { canonical: getCanonical("/register") },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  if (verifyMemberSessionToken(cookies().get(MEMBER_COOKIE_NAME)?.value)) redirect("/member");
  return <RegisterClient />;
}
