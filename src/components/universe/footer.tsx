import Link from "next/link";

import { plexVariables } from "@/app/fonts";
import { CONTACT } from "@/content/work";
import { routes } from "@/lib/routes";
import { SOCIAL_LINKS, type SocialId } from "@/lib/socials";

import { BackToEarth, HomeLink } from "./footer-actions";
import { GlyphText } from "./glyph-text";
import { ResumeMark } from "./resume-mark";
import s from "./footer.module.css";

type Icon = "home" | "story" | "contact" | "resume" | "email" | SocialId;
type Drawn = Exclude<Icon, SocialId | "resume">;

/* Every way off the page: the site's pages, the resume, the profiles, and
   a way to write. */
const WAYS: { label: string; href: string; icon: Icon; away?: boolean }[] = [
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

/* Each profile's own mark, from svglogos.dev (public/logos/social/). */
const MARKS: Record<SocialId, string> = {
  github: "/logos/social/github-icon.svg",
  linkedin: "/logos/social/linkedin-icon.svg",
  x: "/logos/social/x.svg",
};

/**
 * The foot of every page. On the left, a large "m.", drawn in the
 * terminal's glyphs: it comes apart under the pointer and settles back
 * (glyph-text.tsx). On the right, level with it from its top to its
 * foot, every way off the page, each with its mark, which plays a small
 * trick when pointed at (footer.module.css), and under them the sign-off.
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
                  <Mark icon={w.icon} />
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

/** A way's mark: a profile's own logo, or a small drawing of its own. */
function Mark({ icon }: { icon: Icon }) {
  if (icon === "resume") return <ResumeMark className={s.icon} />;
  if (icon === "github" || icon === "linkedin" || icon === "x")
    return (
      <span
        className={`${s.icon} ${s.logo}`}
        style={{ maskImage: `url(${MARKS[icon]})` }}
        aria-hidden
      />
    );
  return (
    <svg
      className={s.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {DRAWINGS[icon]}
    </svg>
  );
}

const DRAWINGS: Record<Drawn, React.ReactNode> = {
  /* Home is Earth: a globe, which turns. */
  home: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <ellipse className={s.meridian} cx="12" cy="12" rx="4" ry="8.5" />
      <ellipse className={`${s.meridian} ${s.late}`} cx="12" cy="12" rx="4" ry="8.5" />
    </>
  ),
  /* An open book; a page turns. */
  story: (
    <>
      <path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5" />
      <path d="M12 6.5c2-1.5 5-1.9 8.5-1.5v13c-3.5-.4-6.5 0-8.5 1.5" />
      <path d="M12 6.5v13" />
      <path
        className={s.leaf}
        d="M12 6.5c2-1.5 5-1.9 8.5-1.5v13c-3.5-.4-6.5 0-8.5 1.5"
      />
    </>
  ),
  /* A speech bubble; someone is typing. */
  contact: (
    <>
      <path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
      <circle className={s.typing} cx="8" cy="10.5" r="0.6" fill="currentColor" />
      <circle className={s.typing} cx="12" cy="10.5" r="0.6" fill="currentColor" />
      <circle className={s.typing} cx="16" cy="10.5" r="0.6" fill="currentColor" />
    </>
  ),
  /* An envelope; its flap opens. */
  email: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path className={s.flap} d="M3.5 6.8 12 13l8.5-6.2" />
    </>
  ),
};
