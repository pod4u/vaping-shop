import type { Metadata } from "next";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pod4u.store";
export const SITE_NAME = "Pod4U";
export const SITE_TAGLINE = "ร้านขายพอด ราคาส่ง ครบ จบในที่เดียว";

export function getTitle(page: string): string {
  return `${page} | ${SITE_NAME}`;
}

export function getCanonical(path: string): string {
  return `${APP_URL}${path}`;
}

export function baseMetadata(overrides: Metadata = {}): Metadata {
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: `${SITE_NAME} - ${SITE_TAGLINE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_TAGLINE,
    openGraph: {
      type: "website",
      locale: "th_TH",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
    },
    ...overrides,
  };
}

export function noIndexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: true,
    },
  };
}

/**
 * Serialize JSON-LD safely — escape "</" to prevent breaking out of <script> tags.
 * See: https://web.dev/structured-data/#script-tag
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
