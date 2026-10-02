"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { routes } from "@/lib/routes";
import { cameFrom } from "@/lib/visit";

/**
 * A way back to the universe. Coming from it, this is the browser's own
 * back, so the universe opens where it was left (the same chapter, the
 * opening not played again); arriving from anywhere else, it opens the
 * universe from the top.
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
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
