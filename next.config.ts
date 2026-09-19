import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `basePath` or `assetPrefix`. Either would pin assets and client
  // navigations to a single origin. This site is served from preview URLs,
  // `*.vercel.app`, and a custom production domain; `/story` must resolve
  // against whichever host the visitor is already on.
  redirects() {
    return ["/about", "/work", "/contact", "/changelog", "/resume"].map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
  },
};

export default nextConfig;
