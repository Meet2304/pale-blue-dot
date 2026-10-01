"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isTerminalRoute } from "@/lib/routes";

/* Its own chunk, fetched only on a Horizon page. */
const Footer = dynamic(() => import("./footer-body").then((m) => m.Footer));

/**
 * The main site's original dot-field footer, with its public link graph reduced
 * to the routes and social profiles that are intentionally visible right now.
 */
export function SiteFooter() {
  const pathname = usePathname();

  /* The Terminal pages end on their own terms. Returning here, rather than
     after the hooks below, means the footer mounts fresh on arrival from one of
     them, so its measuring effects run against real nodes. */
  if (isTerminalRoute(pathname)) return null;

  return <Footer pathname={pathname} />;
}
