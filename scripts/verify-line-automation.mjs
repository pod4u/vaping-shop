import assert from 'node:assert/strict';
import {
  buildAutomationMenuMessage,
  buildGreetingMessage,
  isCancellationQuestion,
  isDispatchScheduleQuestion,
  isExplicitProductOrder,
  isGenericMarboFamilyQuestion,
  isGreeting,
  isOrderHelpQuestion,
  isPaymentQuestion,
  isProductAvailabilityQuestion,
  isShippingQuestion,
  isTrackingQuestion,
  shouldHandOffImageWithoutReply,
} from '../src/lib/line-automation.ts';

const cases = [
  [isProductAvailabilityQuestion, 'มาโบมีรสสตอเหลือไหม', true],
  [isProductAvailabilityQuestion, 'm bar มีอะไรเหลือบ้าง', true],
  [isGenericMarboFamilyQuestion, 'มาโบมีอะไรเหลือ', true],
  [isGenericMarboFamilyQuestion, 'มาโบมีรสอะไรบ้าง?', true],
  [isGenericMarboFamilyQuestion, 'MARBO มีไหม', true],
  [isGenericMarboFamilyQuestion, 'มาโบ องุ่นมีไหม', false],
  [isGenericMarboFamilyQuestion, 'M BAR มีอะไรเหลือ', false],
  [isOrderHelpQuestion, 'สั่งยังไงคะ', true],
  [isOrderHelpQuestion, 'ซื้ออย่างไร', true],
  [isExplicitProductOrder, 'ต้องการสั่งอันนี้', true],
  [isExplicitProductOrder, 'สั่ง marbo blueberry 2 ตัว', true],
  [isExplicitProductOrder, 'marbo blueberry มีไหม', false],
  [isShippingQuestion, 'ส่งฟรีไหมคะ', true],
  [isDispatchScheduleQuestion, 'วันนี้ตัดรอบกี่โมง', true],
  [isPaymentQuestion, 'ขอเลขบัญชีค่ะ', true],
  [isTrackingQuestion, 'เลขพัสดุออกหรือยัง', true],
  [isCancellationQuestion, 'ขอยกเลิกออเดอร์', true],
  [isGreeting, 'สวัสดีค่ะ', true],
  [isGreeting, 'สวัสดีค่ะ มีมาโบไหม', false],
];

for (const [matcher, input, expected] of cases) {
  assert.equal(matcher(input), expected, `${matcher.name} failed for: ${input}`);
}

const menu = buildAutomationMenuMessage();
const secondaryMenu = buildAutomationMenuMessage('secondary');
assert.equal(menu.type, 'flex');
assert.equal(menu.contents.body.contents.filter((item) => item.type === 'box').length, 3);
assert.equal(menu.contents.footer.contents.length, 2);
assert.match(menu.contents.body.contents.at(-1).text, /คะ\?$/);
const memberButton = menu.contents.footer.contents[1];
assert.equal(memberButton.action.type, 'uri');
assert.match(memberButton.action.uri, /^https:\/\/liff\.line\.me\/[A-Za-z0-9-]+$/);
assert.equal('displayText' in memberButton.action, false);

const newCustomerGreeting = buildGreetingMessage({ linked: false, hasDefaultAddress: false });
const linkedCustomerGreeting = buildGreetingMessage({ linked: true, hasDefaultAddress: true });
const missingAddressGreeting = buildGreetingMessage({ linked: true, hasDefaultAddress: false });
const secondaryGreeting = buildGreetingMessage({ linked: true, hasDefaultAddress: true }, 'secondary');

assert.match(JSON.stringify(secondaryMenu), /oa=secondary/);
assert.match(JSON.stringify(secondaryGreeting), /oa=secondary(?:&|\\u0026)next=orders/);
for (const greeting of [newCustomerGreeting, linkedCustomerGreeting, missingAddressGreeting]) {
  assert.equal(greeting.type, 'text');
  assert.equal(greeting.quickReply.items.length, 2);
}
assert.notEqual(newCustomerGreeting.text, linkedCustomerGreeting.text);
assert.notEqual(linkedCustomerGreeting.text, missingAddressGreeting.text);
assert.equal(newCustomerGreeting.quickReply.items[1].action.type, 'uri');
assert.equal(newCustomerGreeting.quickReply.items[1].action.label, 'เข้าสู่ระบบสมาชิก');
assert.match(linkedCustomerGreeting.quickReply.items[1].action.uri, /\?next=orders$/);
assert.equal(shouldHandOffImageWithoutReply('LINE_IDENTITY_NOT_FOUND'), true);
assert.equal(shouldHandOffImageWithoutReply('NO_ACTIVE_PAYMENT'), true);
assert.equal(shouldHandOffImageWithoutReply('AMOUNT_MISMATCH'), false);
assert.equal(shouldHandOffImageWithoutReply('SLIP_NOT_FOUND'), false);

console.log(`✓ LINE automation intent checks passed (${cases.length} cases).`);
