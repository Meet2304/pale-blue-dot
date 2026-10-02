"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { notePath } from "@/lib/visit";

/**
 * What survives navigation, outside every page: the skip link, and a note
 * of where the visitor has been, for the back links (back-link.tsx).
 */
export function SiteChrome() {
  const pathname = usePathname();
  useEffect(() => notePath(pathname), [pathname]);
  return (
    <a href="#content" className="skip">
      Skip to content
    </a>
  );
}
