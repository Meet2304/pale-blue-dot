import Script from "next/script";

import { analyticsEnabled, GA_MEASUREMENT_ID } from "@/lib/site";

/**
 * The Google tag for G-73KX8NNENQ, loaded once the page is idle: it is
 * the largest script on the page, and it waits for nothing the visitor
 * sees.
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
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
