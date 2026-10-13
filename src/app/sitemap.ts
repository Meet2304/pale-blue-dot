import type { MetadataRoute } from "next";

import { UNITS } from "@/content/work";

import { absoluteUrl } from "@/lib/site";

/** Every URL a crawler should keep. Redirects are not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: {
    path: string;
    changeFrequency: "weekly" | "monthly" | "yearly";
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.9 },
    { path: "/work", changeFrequency: "weekly", priority: 0.9 },
    { path: "/story", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
    { path: "/resume", changeFrequency: "monthly", priority: 0.7 },
    { path: "/changelog", changeFrequency: "monthly", priority: 0.5 },
    ...UNITS.map((unit) => ({
      path: `/work/${unit.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { path: "/meet-bhatt-resume.pdf", changeFrequency: "yearly", priority: 0.4 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
}
