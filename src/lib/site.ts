import type { Metadata } from "next";

import { SOCIAL_LINKS } from "@/lib/socials";

/**
 * The one origin search engines and agents should cite. Preview hosts and
 * localhost keep their own metadataBase for cards, and point canonical URLs
 * here so they never compete with this name.
 */
export const SITE_ORIGIN = "https://www.meetbhatt.com";

export const SITE_NAME = "Meet Bhatt";

export const PERSON_ID = `${SITE_ORIGIN}/#person`;

export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/** The measurement id from the Google tag. Public by design: it ships in the page. */
export const GA_MEASUREMENT_ID = "G-73KX8NNENQ";

/**
 * Who he is, in the length a search result can show. The home page, the
 * cards, and the agent files all say this, so the name is one fact.
 */
export const SITE_DESCRIPTION =
  "Meet Bhatt is an AI engineer and product builder, a J N Tata Scholar studying Artificial Intelligence Engineering and Technology Innovation Management at Carnegie Mellon University.";

/** Profiles that are his, and only his, so the name resolves to this person. */
export const SAME_AS = SOCIAL_LINKS.map((link) => link.href);

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Preview deployments are real hosts. They must not be indexed, or a
 * `*.vercel.app` copy of the site can outrank the name.
 */
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV !== "preview";
}

/** The tag loads in production, including a local production server, and not on previews. */
export function analyticsEnabled(): boolean {
  return process.env.NODE_ENV === "production" && isIndexable();
}

/**
 * Canonical URL, and the agent files, on one page. Open Graph and Twitter
 * titles are written out in full: the layout template applies to `title`,
 * and a page that also sets the cards keeps them in step with it.
 */
export function pageMetadata(
  path: string,
  details: { title: string | { absolute: string }; description: string },
): Metadata {
  const titled =
    typeof details.title === "string"
      ? `${details.title} — ${SITE_NAME}`
      : details.title.absolute;

  return {
    title: details.title,
    description: details.description,
    alternates: {
      canonical: absoluteUrl(path),
      types: {
        "text/plain": absoluteUrl("/llms.txt"),
        "text/markdown": absoluteUrl("/llm.md"),
      },
    },
    openGraph: {
      url: absoluteUrl(path),
      title: titled,
      description: details.description,
    },
    twitter: {
      title: titled,
      description: details.description,
    },
  };
}
