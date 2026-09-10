# Future Roadmap: LINE Image Product Recognition

**Project:** Pod4U  
**Status:** Deferred — implement when customer image volume increases  
**Recorded:** 2026-09-10  
**Priority:** Future enhancement, not required for the current launch

## Decision

Do not add paid AI image recognition yet. Customer volume is currently low, so the operational benefit does not justify introducing another API, billing account, failure mode, and monitoring requirement.

The current safe behavior remains in production:

- If a verified LINE member has an active, unexpired payment request in `awaiting_slip`, an incoming image is treated as a possible payment slip and sent to Thunder.
- If there is no active payment request, the image is handed off silently to the LINE OA admin.
- The bot does not claim that an unknown product is available.
- Product-reference images are not sent to Thunder.
- Chat images and message bodies are not stored in Supabase by this flow.

## Future Goal

When a customer sends a product photo, identify the likely brand and model, compare it only with the active Pod4U catalog in Supabase, and respond with an accurate sales-oriented next step.

The AI result must never become the source of truth for product availability. Supabase catalog records and current stock remain authoritative.

## Recommended Future Flow

1. Receive an image from the LINE webhook.
2. Check for an active payment request first.
3. If payment is awaiting a slip, preserve the existing Thunder verification flow.
4. Otherwise, download the LINE image temporarily and resize it before analysis.
5. Send the image to a low-cost vision model for OCR and product identification.
6. Require structured output containing:
   - detected brand;
   - detected model;
   - visible label text;
   - confidence score;
   - whether the image appears to be a product, payment slip, or unknown object.
7. Compare the detected result against active brands, products, and variants from Supabase.
8. Generate a response from catalog data only.
9. Discard the temporary image after processing.

## Response Rules

### Confident catalog match

> สินค้านี้คือ M BAR 10K ค่ะ ร้านมีจำหน่าย ตอนนี้มีรสพร้อมส่งตามรายการด้านล่าง ลูกค้าสนใจรสไหนคะ

The response must include a direct action to live stock or the matched product.

### Confident non-catalog product

> สินค้าที่ส่งมายังไม่มีจำหน่ายในร้านค่ะ ตอนนี้ร้านมีแบรนด์ตามรายการสินค้าพร้อมส่ง ลูกค้าชอบแนวรสไหนคะ เดี๋ยวแนะนำรุ่นใกล้เคียงให้ค่ะ

The list of brands must be loaded from active Supabase catalog data and must not be hard-coded.

### Low confidence or unreadable image

> ยังระบุแบรนด์หรือรุ่นจากรูปนี้ไม่ได้ชัดเจนค่ะ รบกวนส่งรูปด้านหน้าที่เห็นชื่อรุ่น หรือพิมพ์ชื่อแบรนด์มาได้เลยค่ะ

Never state that the store does not sell a product when confidence is low.

## Provider Plan

Design a small provider interface so the application can switch between OpenAI and Gemini without rewriting LINE or catalog logic.

Suggested environment variables:

```env
IMAGE_RECOGNITION_PROVIDER=gemini
IMAGE_RECOGNITION_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=
OPENAI_API_KEY=
IMAGE_RECOGNITION_MONTHLY_LIMIT=
```

Initial recommendation: pilot with the Gemini free tier. For paid production traffic, benchmark Gemini against OpenAI GPT-5.6 Luna using real Pod4U product photos before choosing a permanent provider.

Pricing changes frequently. Recheck the official pricing pages before implementation:

- Gemini API: <https://ai.google.dev/gemini-api/docs/pricing>
- OpenAI models: <https://developers.openai.com/api/docs/models>

## Cost and Abuse Controls

- Analyze each LINE message ID at most once.
- Reject oversized or unsupported image files before calling an AI provider.
- Resize images to the minimum resolution that keeps labels readable.
- Use short prompts and bounded structured output.
- Set a monthly request or spending limit.
- Do not retry low-confidence recognition automatically.
- Do not call web search or image generation.
- Do not store customer images unless a separate retention policy is approved.

## Implementation Trigger

Reconsider this feature when at least one condition is met:

- Admins receive approximately 10 or more product-reference images per day.
- Answering product-photo questions becomes a repeated manual workload.
- Customers regularly leave the conversation because image questions are answered too slowly.
- A promotion materially increases LINE image traffic.

## Acceptance Criteria

- Payment slips continue to use Thunder only when an active payment request exists.
- Product images never confirm payment or change order/stock state.
- Catalog availability is read from Supabase and is never invented by the model.
- Low-confidence results request more information instead of guessing.
- Duplicate LINE message IDs do not create duplicate AI calls or replies.
- Customer-facing copy consistently uses `ค่ะ` and ends with a useful next action.
- Images are processed transiently and are not retained by Pod4U.
- Automated tests cover sold product, unsupported product, unclear image, real slip, duplicate image, API timeout, and provider quota exhaustion.
- The admin can see recognition failures without receiving or storing unnecessary customer-image data.

## Out of Scope Until Reopened

- Training or fine-tuning a custom vision model.
- Automatic catalog creation from customer images.
- Automatically adding unsupported products to inventory.
- Using AI confidence alone to confirm that the store sells an item.
- Long-term storage of customer-submitted images.

