import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `basePath` or `assetPrefix`. Either would pin assets and client
  // navigations to a single origin. This site is served from preview URLs,
  // `*.vercel.app`, and a custom production domain; `/story` must resolve
  // against whichever host the visitor is already on.
  redirects() {
    /* These paths are gone. A permanent redirect passes whatever pointed
       at them on to the home page, which is the page for the name. */
    return ["/about", "/work", "/changelog", "/resume"].map((source) => ({
      source,
      destination: "/",
      permanent: true,
    }));
  },
};

export default nextConfig;
