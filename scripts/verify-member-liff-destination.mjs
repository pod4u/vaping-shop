import assert from "node:assert/strict";
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

console.log("Member LIFF destination verification: PASS");
