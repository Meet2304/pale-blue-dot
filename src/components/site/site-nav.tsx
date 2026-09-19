"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/routes";

const PUBLIC_ITEMS = [
  { href: routes.home, label: "Home" },
  { href: routes.story, label: "Story" },
] as const;

/** The temporary public navigation exposes only the holding page and Story. */
export function SiteNav({ visible }: { visible: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="hz-nav"
      aria-label="Site"
      data-nav={visible ? "visible" : "hidden"}
      inert={!visible}
    >
      <div className="hz-nav-inner">
        <Link href={routes.home} className="hz-nav-mark">
          <span className="hz-nav-dot" aria-hidden />
          Pale Blue Dot
        </Link>

        <ul className="hz-nav-list">
          {PUBLIC_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="hz-nav-link"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
