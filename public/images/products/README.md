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
- `moood/monster-series-14k/grape-5.jpg` is the current 5% Grape asset.
- `moood/monster-series-14k/kyoho-grape-3.jpg` is the current 3% Kyoho Grape asset.
- The previous 3% Grape asset is retained as `moood/monster-series-14k/grape-3.webp` for reference.

## Missing or pending assets for the current LINE catalog

- MARBO M SWITCH 15K: Grape still needs an individual product image. Eleven flavor images are now stored with canonical flavor filenames; ten were supplied by the shop owner and Grape Aloe was sourced from the linked FATVAPOR product page.
- ALFA Duo Mesh 20K Watermelon Strawberry: no matching image is currently available.
- VPLUS 16K Double Apple Shisha: no matching image is currently available.
