import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveMemberLiffDestination } from "../src/lib/member-liff-destination.ts";
import {
  buildMemberLiffUrl,
  resolveMemberLiffAccount,
} from "../src/lib/line-account-links.ts";

assert.equal(resolveMemberLiffDestination(""), "/member");
assert.equal(resolveMemberLiffDestination("?next=orders"), "/member#orders");
assert.equal(resolveMemberLiffDestination("?next=unknown"), "/member");
assert.equal(
  resolveMemberLiffDestination("?liff.state=%2F%3Fnext%3Dorders"),
  "/member#orders",
);
assert.equal(
  resolveMemberLiffDestination("?lineAppVersion=16.9.0&liff.state=%3Fnext%3Dorders"),
  "/member#orders",
);
assert.equal(resolveMemberLiffAccount("?oa=secondary"), "secondary");
assert.equal(resolveMemberLiffAccount("?oa=unknown"), "primary");
assert.equal(
  resolveMemberLiffAccount("?liff.state=%2F%3Foa%3Dsecondary%26next%3Dorders"),
  "secondary",
);
assert.equal(
  buildMemberLiffUrl("secondary", "orders"),
  "https://liff.line.me/2011511843-ReAPLsJH?oa=secondary&next=orders",
);

const memberLiffClient = readFileSync("src/app/(public)/member/liff/MemberLiffClient.tsx", "utf8");
for (const expectedCopy of [
  "กำลังเชื่อมต่อกับ LINE",
  "กำลังยืนยันข้อมูลสมาชิก",
  "กำลังเปิดออเดอร์ของคุณ",
  "ใกล้เสร็จแล้ว กรุณารอสักครู่นะคะ",
  "โหลดใหม่อีกครั้ง",
]) {
  assert.ok(memberLiffClient.includes(expectedCopy), `Missing LIFF loading copy: ${expectedCopy}`);
}
assert.ok(memberLiffClient.includes("5_000"), "Missing slow-loading hint timer");
assert.ok(memberLiffClient.includes("15_000"), "Missing retry timer");

console.log("Member LIFF destination verification: PASS");
