import Link from "next/link";

import { plexVariables } from "@/app/fonts";
import { CONTACT } from "@/content/work";
import { routes } from "@/lib/routes";
import { SOCIAL_LINKS } from "@/lib/socials";

import { BackToEarth, HomeLink } from "./footer-actions";
import { GlyphText } from "./glyph-text";
import s from "./footer.module.css";
import { WayMark, type WayIcon } from "./way-mark";

/* Every way off the page: the site's pages, the resume, the profiles, and
   a way to write. */
const WAYS: { label: string; href: string; icon: WayIcon; away?: boolean }[] = [
  { label: "Home", href: routes.home, icon: "home" },
  { label: "Story", href: routes.story, icon: "story" },
  { label: "Contact", href: routes.contact, icon: "contact" },
  { label: "Resume", href: CONTACT.resume, icon: "resume", away: true },
  ...SOCIAL_LINKS.map((l) => ({
    label: l.label,
    href: l.href,
    icon: l.id,
    away: true,
  })),
  { label: "Email", href: `mailto:${CONTACT.email}`, icon: "email" },
];

/**
 * The foot of every page. On the left, a large "m.", drawn in the
 * terminal's glyphs: it comes apart under the pointer and settles back
 * (glyph-text.tsx). On the right, level with it from its top to its
 * foot, every way off the page, each with its mark, which plays a small
 * trick when pointed at (way-mark.tsx), and under them the sign-off.
 * On a phone the ways come first, then the "m.", then the sign-off.
 */
export function Footer() {
  return (
    <footer className={`${plexVariables} ${s.foot}`}>
      <div className={s.grid}>
        <HomeLink className={s.mark} aria-label="Meet Bhatt: home">
          <GlyphText text="m" dot weight={400} className={s.glyphs} />
        </HomeLink>
        <nav className={s.links} aria-label="Pages and elsewhere">
          <ul className={s.list}>
            {WAYS.map((w) => {
              const inner = (
                <>
                  <WayMark icon={w.icon} />
                  {w.label}
                  {w.away && (
                    <span className={s.away} aria-hidden>
                      ↗
                    </span>
                  )}
                </>
              );
              return (
                <li key={w.label}>
                  {w.away || w.href.startsWith("mailto:") ? (
                    <a
                      href={w.href}
                      data-icon={w.icon}
                      {...(w.away ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {inner}
                    </a>
                  ) : w.href === routes.home ? (
                    <HomeLink data-icon={w.icon}>{inner}</HomeLink>
                  ) : (
                    <Link href={w.href} data-icon={w.icon}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <p className={s.sign}>
          <span>Made by Humans, on Earth</span>
          <span>© {new Date().getFullYear()} Meet Bhatt</span>
        </p>
      </div>
      <BackToEarth />
    </footer>
  );
}
