import Script from "next/script";

import { analyticsEnabled, GA_MEASUREMENT_ID } from "@/lib/site";

/**
 * The Google tag for G-73KX8NNENQ, loaded the way the snippet specifies.
 * The property already records history changes, so a client navigation
 * between pages is a page view without a second listener here.
 * Previews omit it, so they do not write into the property.
 */
export function GoogleAnalytics() {
  if (!analyticsEnabled()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
