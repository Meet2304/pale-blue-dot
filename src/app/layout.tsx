import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Marcellus, Space_Mono } from "next/font/google";

import "./globals.css";

/* Horizon's three faces. The design system loads them from Google's CDN with an
   @import; next/font self-hosts the same families instead, which removes the
   render-blocking round trip the load sequence would otherwise have to wait on. */
const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meet Bhatt — What’s missing, I make.",
  description: "Personal site of Meet Bhatt.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Dark-only: in Horizon the night is the canvas, not a preference.
      className={`dark ${marcellus.variable} ${hanken.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
