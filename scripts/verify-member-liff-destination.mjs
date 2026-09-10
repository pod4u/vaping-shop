import assert from "node:assert/strict";
import { resolveMemberLiffDestination } from "../src/lib/member-liff-destination.ts";

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

console.log("Member LIFF destination verification: PASS");
