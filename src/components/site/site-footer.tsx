"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/routes";
import { SOCIAL_LINKS } from "@/lib/socials";

/**
 * The public footer exposes only the two routes available while the rest of the
 * site is under construction.
 */
export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer data-site-footer className="hz-public-footer">
      <nav aria-label="Footer" className="hz-foot-nav">
        <Link
          href={routes.home}
          className="hz-foot-link"
          aria-current={pathname === routes.home ? "page" : undefined}
        >
          Home
        </Link>
        <Link
          href={routes.story}
          className="hz-foot-link"
          aria-current={pathname === routes.story ? "page" : undefined}
        >
          Story
        </Link>
      </nav>
      <nav aria-label="Social profiles" className="hz-foot-nav">
        {SOCIAL_LINKS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="hz-foot-link"
            target="_blank"
            rel="noreferrer"
          >
            {item.label}
          </a>
        ))}
      </nav>
      <p>Made by Humans, on Earth</p>
    </footer>
  );
}
