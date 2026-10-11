import type { MetadataRoute } from "next";

import { absoluteUrl, isIndexable } from "@/lib/site";

/* Paths that only redirect home. `/work/<id>` is a real page, so `/work`
   itself is not in this list: a disallow of `/work` would hide every piece. */
const RETIRED = ["/about", "/changelog", "/resume"];

/* Agents that fetch on their own, named so the file says they are welcome.
   `*` already allows them; a group of their own keeps that true if the
   default rule ever tightens. */
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
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const publicSite = { allow: "/", disallow: RETIRED };

  return {
    rules: [
      { userAgent: "*", ...publicSite },
      { userAgent: AGENTS, ...publicSite },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: "www.meetbhatt.com",
  };
}
