"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { routes } from "@/lib/routes";
import { cameFrom, requestHomeRestore } from "@/lib/visit";

/**
 * A way back to the universe. Coming from it, the universe opens where it
 * was left (the same place in it, the opening not played again); arriving
 * from anywhere else, it opens from the top. It is a navigation forward,
 * not the browser's back, so the page change animates (page-transition.tsx).
 */
export function BackLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={routes.home}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (cameFrom() !== routes.home) return;
        e.preventDefault();
        requestHomeRestore();
        router.push(routes.home, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
