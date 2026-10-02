"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/universe/footer";
import { isTerminalRoute } from "@/lib/routes";

/**
 * The foot of the pages outside the Terminal system (the 404, say): the
 * same foot as everywhere else. The Terminal pages place their own, inside
 * their page transition.
 */
export function SiteFooter() {
  const pathname = usePathname();
  if (isTerminalRoute(pathname)) return null;
  return (
    <div data-site-footer>
      <Footer />
    </div>
  );
}
