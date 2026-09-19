import type { MetadataRoute } from "next";

const PRIVATE_ROUTES = ["/about", "/work", "/contact", "/changelog", "/resume"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/story"],
      disallow: PRIVATE_ROUTES,
    },
  };
}
