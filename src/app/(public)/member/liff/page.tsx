import type { Metadata } from "next";
import MemberLiffClient from "./MemberLiffClient";

export const metadata: Metadata = { title: "เข้าสู่ระบบสมาชิก", robots: { index: false, follow: false } };

export default function MemberLiffPage() {
  return <MemberLiffClient />;
}
