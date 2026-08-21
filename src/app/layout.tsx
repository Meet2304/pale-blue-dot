import type { Metadata, Viewport } from "next";

import { NavLabProvider } from "@/components/site/nav-lab/provider";
import { SiteChrome } from "@/components/site/site-chrome";
import { SiteFooter } from "@/components/site/site-footer";

import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Meet Bhatt — What’s missing, I make.",
    template: "%s — Meet Bhatt",
  },
  description: "Personal site of Meet Bhatt.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <NavLabProvider>
          <SiteChrome />
          {/* The star field is fixed at z-index 0. An explicit 1 here rather than
            a negative index on the canvas: nothing on <body> creates a stacking
            context today, but the day someone adds a transform or an isolation
            to a wrapper, z-index: -1 would quietly disappear behind the page
            background and this would not. */}
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
          <SiteFooter />
        </NavLabProvider>
      </body>
    </html>
  );
}
