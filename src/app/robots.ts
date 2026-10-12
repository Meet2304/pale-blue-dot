import type { MetadataRoute } from "next";

import { absoluteUrl, isIndexable } from "@/lib/site";

/* Agents that fetch on their own, named so the file says they are welcome. */
const AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  /* A preview must not compete with the production domain. */
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  /* Nothing on the production host is withheld. A disallow is what kept
     the work and the contact page out of Google's index. */
  const publicSite = { allow: "/" };

  return {
    rules: [
      { userAgent: "*", ...publicSite },
      { userAgent: AGENTS, ...publicSite },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: "www.meetbhatt.com",
  };
}
