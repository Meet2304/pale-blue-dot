"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/routes";

import s from "./footer.module.css";

const toTop = () =>
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });

/**
 * A link home. Already home, it takes the page back up to Earth rather
 * than doing nothing.
 */
export function HomeLink({
  className,
  children,
  ...rest
}: {
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      href={routes.home}
      className={className}
      {...rest}
      onClick={(e) => {
        if (pathname !== routes.home) return;
        e.preventDefault();
        toTop();
      }}
    >
      {children}
    </Link>
  );
}

/**
 * "Back to Earth": at the very bottom of the page, a way back up to the
 * top, which shows only once there is nowhere further down to go.
 */
export function BackToEarth() {
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const check = () => {
      const end = document.documentElement.scrollHeight - window.innerHeight;
      setAtEnd(end > 0 && window.scrollY >= end - 24);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <button
      type="button"
      className={s.toEarth}
      data-shown={atEnd}
      tabIndex={atEnd ? 0 : -1}
      aria-hidden={!atEnd}
      onClick={toTop}
    >
      <span aria-hidden>↑</span> Back to Earth
    </button>
  );
}
