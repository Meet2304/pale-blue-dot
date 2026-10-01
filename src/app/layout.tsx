import type { Metadata, Viewport } from "next";

import { SiteChrome } from "@/components/site/site-chrome";
import { SiteFooter } from "@/components/site/site-footer";

import { fontVariables } from "./fonts";
import "./globals.css";

/* Where the site lives, for the absolute links social cards need: the
   production domain in production, the deployment's own address on a
   preview, and this machine in development. */
const siteUrl =
  process.env.VERCEL_ENV === "production"
    ? "https://www.meetbhatt.com"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT ?? 3000}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Meet Bhatt — This pale blue dot is where I build things.",
    template: "%s — Meet Bhatt",
  },
  description: "Personal site of Meet Bhatt.",
  /* The shared card, for every platform that reads Open Graph (LinkedIn,
     WhatsApp, Slack, Teams, Facebook, iMessage, Discord) and for X. The
     image itself is src/app/opengraph-image.jpg (and twitter-image.jpg),
     1200 × 630, which Next.js adds to every page with its size and alt. */
  openGraph: {
    type: "website",
    siteName: "Meet Bhatt",
    locale: "en_US",
    title: "Meet Bhatt — AI engineer and product builder",
    description:
      "I am an Engineer. This pale blue dot is where I build things: AI products, research and the people who made them.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@Meet2304",
    creator: "@Meet2304",
    title: "Meet Bhatt — AI engineer and product builder",
    description:
      "I am an Engineer. This pale blue dot is where I build things: AI products, research and the people who made them.",
  },
  /* The "m." mark: white on black where the browser is dark, black on
     white where it is light (public/logos). */
  icons: {
    icon: [
      ...[16, 32].map((n) => ({
        url: `/logos/meet_logo_dark_v0.1/favicon-${n}x${n}.png`,
        sizes: `${n}x${n}`,
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      })),
      ...[16, 32].map((n) => ({
        url: `/logos/redketchup/favicon-${n}x${n}.png`,
        sizes: `${n}x${n}`,
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      })),
    ],
    apple: [
      {
        url: "/logos/meet_logo_dark_v0.1/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <SiteChrome />
        {/* The star field is fixed at z-index 0. An explicit 1 here rather than
            a negative index on the canvas: nothing on <body> creates a stacking
            context today, but the day someone adds a transform or an isolation
            to a wrapper, z-index: -1 would quietly disappear behind the page
            background and this would not. */}
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
