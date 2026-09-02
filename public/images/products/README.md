# Product image conventions

Product images are organized by canonical brand and model:

```text
/images/products/{brand-slug}/{model-slug}/{flavor-slug}.{ext}
```

Rules:

- Use lowercase ASCII and kebab-case.
- Keep price and stock out of file names.
- Add nicotine strength only when separate images exist for separate sellable variants.
- Database records should store the public path, not the filesystem path.
- Product and order records must reference a stable SKU/variant ID rather than an image name.

## Confirmed corrections

- `marbo/m-bar-9k/blue-ice.webp` was previously named `blue.webp`; the image label says `BLUE ICE`.
- `vplus/16k/kyoho-grape.jpg` was previously named `peach.jpg`; the image label says `KYOHO GRAPE / PREMIUM GRAPE`.
- `vplus/16k/grape-alt.jpg` was previously named `grape-2.jpg`; it remains an alternate Grape asset pending SKU confirmation.
- The product logo in the 14K Monster Series images is spelled `MOOOD`.

## Missing or pending assets for the current LINE catalog

- MARBO M SWITCH: confirm the exact model and provide product images for every sellable flavor.
- MOOOD 14K Kyoho Grape 3%: no matching image is currently available.
- ALFA Duo Mesh 20K Watermelon Strawberry: no matching image is currently available.
- VPLUS 16K Double Apple Shisha: no matching image is currently available.
- MOOOD nicotine variants: current images show 3%; a distinct 5% Grape image is still needed if packaging differs.
