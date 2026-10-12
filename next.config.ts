import type { NextConfig } from "next";

import { UNITS } from "./src/content/work";

const nextConfig: NextConfig = {
  // No `basePath` or `assetPrefix`. Either would pin assets and client
  // navigations to a single origin. This site is served from preview URLs,
  // `*.vercel.app`, and a custom production domain; `/story` must resolve
  // against whichever host the visitor is already on.
  redirects() {
    /* Old addresses with no page of their own. Each one lands on the
       indexable page that actually holds that thing, in one hop. */
    return [
      { source: "/nav-lab", destination: "/", permanent: true },
      { source: "/coming-soon", destination: "/", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/cv", destination: "/resume", permanent: true },
      { source: "/cv.pdf", destination: "/meet-bhatt-resume.pdf", permanent: true },
      { source: "/resume.pdf", destination: "/meet-bhatt-resume.pdf", permanent: true },
      ...UNITS.map((unit) => ({
        source: `/${unit.id}`,
        destination: `/work/${unit.id}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
