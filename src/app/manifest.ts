import type { MetadataRoute } from "next";

/* Installed to a home screen: the "m." mark, on black like the site. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meet Bhatt",
    short_name: "Meet",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [192, 512].map((n) => ({
      src: `/logos/meet_logo_dark_v0.1/android-chrome-${n}x${n}.png`,
      sizes: `${n}x${n}`,
      type: "image/png",
    })),
  };
}
