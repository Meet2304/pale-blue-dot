"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SocialLogo } from "@/components/site/social-logo";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { routes } from "@/lib/routes";
import { SOCIAL_LINKS } from "@/lib/socials";

const PAGES = [
  { href: routes.home, label: "Home" },
  { href: routes.story, label: "Story" },
] as const;

/**
 * The main site's original dot-field footer, with its public link graph reduced
 * to the routes and social profiles that are intentionally visible right now.
 */
export function SiteFooter() {
  const pathname = usePathname();
  const [narrow, setNarrow] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const [textY, setTextY] = useState(0.64);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    const room = roomRef.current;
    if (!field || !room) return;

    const place = () => {
      const fieldBox = field.getBoundingClientRect();
      if (fieldBox.height === 0) return;
      const roomBox = room.getBoundingClientRect();
      setTextY((roomBox.top + roomBox.height / 2 - fieldBox.top) / fieldBox.height);
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(field);
    observer.observe(room);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      data-site-footer
      style={{
        position: "relative",
        zIndex: 1,
        background: "transparent",
        paddingTop: "var(--space-8)",
      }}
    >
      <div aria-hidden ref={fieldRef} className="hz-foot-field">
        <FlickeringGrid
          text="MEET BHATT"
          fontFamily="var(--font-text), sans-serif"
          fontWeight={600}
          fitWidth={narrow ? 0.92 : 0.7}
          letterSpacing="0.06em"
          textY={textY}
          squareSize={2}
          gridGap={3}
          color="var(--ink-400)"
          maxOpacity={0.62}
          textColor="var(--ink-200)"
          textMinOpacity={0.28}
          textMaxOpacity={0.54}
          flickerChance={0.12}
          haloRadius={narrow ? 96 : 140}
          haloOpacity={0.8}
        />
      </div>

      <div className="hz-foot-content">
        <nav aria-label="Footer" className="hz-foot-nav">
          {PAGES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hz-foot-link"
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ul className="hz-foot-icons" aria-label="Social profiles">
          {SOCIAL_LINKS.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                className="hz-foot-icon"
                aria-label={item.label}
                title={item.label}
                target="_blank"
                rel="noreferrer"
              >
                <SocialLogo name={item.id} size={18} />
              </a>
            </li>
          ))}
        </ul>

        <div
          aria-hidden
          ref={roomRef}
          style={{ height: "clamp(4.5rem, 14vw, 9.5rem)" }}
        />

        <p className="hz-foot-small">Made by Humans, on Earth</p>
      </div>
    </footer>
  );
}
