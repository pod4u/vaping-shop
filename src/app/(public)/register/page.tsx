import type { Metadata } from "next";
import { getCanonical } from "@/lib/seo";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
  description: "สมัครสมาชิก Pod4U รับสิทธิพิเศษและข่าวสารโปรโมชั่น",
  alternates: { canonical: getCanonical("/register") },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
