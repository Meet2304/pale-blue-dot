import type { Metadata, Viewport } from "next";

import { fontVariables } from "./fonts";
import "./globals.css";

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
      className={`dark ${fontVariables}`}
    >
      <body>{children}</body>
    </html>
  );
}
