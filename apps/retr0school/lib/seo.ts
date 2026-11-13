import type { Metadata } from "next";

/** Per-page canonical URL plus matching Open Graph / X card tags (the root layout only covers the homepage). */
export function pageMeta(path: string, title: string, description?: string, extra: Metadata = {}): Metadata {
  const ogTitle = `${title} · Retr0 Academy`;
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      ...(description ? { description } : {}),
      url: path,
      siteName: "Retr0 Academy on NEAR",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Learn Web3 with Retr0 Academy" }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, ...(description ? { description } : {}), images: ["/twitter-image"] },
    ...extra,
  };
}
