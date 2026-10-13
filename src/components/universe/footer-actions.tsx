"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const mark = useRef<HTMLSpanElement>(null);
  /* A mark at the foot's last pixel, watched rather than measured: reading
     the page's height on every scroll forced a layout each time. */
  useEffect(() => {
    const el = mark.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setAtEnd(entries[entries.length - 1].isIntersecting),
      { rootMargin: "0px 0px 24px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <span ref={mark} className={s.endMark} aria-hidden />
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
    </>
  );
}
