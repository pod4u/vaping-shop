import type { Metadata } from "next";
import MemberAccessClient from "./MemberAccessClient";

export const metadata: Metadata = { title: "ยืนยันสมาชิก", robots: { index: false, follow: false } };

export default function MemberAccessPage() {
  return <MemberAccessClient />;
}
