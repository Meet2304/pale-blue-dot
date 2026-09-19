"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/routes";

/**
 * The holding page is deliberately a single viewport. Story keeps a restrained
 * way home without exposing any of the unfinished destinations.
 */
export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === routes.home) return null;

  return (
    <footer data-site-footer className="hz-public-footer">
      <nav aria-label="Footer" className="hz-foot-nav">
        <Link href={routes.home} className="hz-foot-link">
          Home
        </Link>
        <Link href={routes.story} className="hz-foot-link" aria-current="page">
          Story
        </Link>
      </nav>
      <p>Made by Humans, on Earth</p>
    </footer>
  );
}
