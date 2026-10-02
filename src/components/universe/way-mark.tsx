import type { ReactNode } from "react";

import type { SocialId } from "@/lib/socials";

import { ResumeMark } from "./resume-mark";
import s from "./way-mark.module.css";

export type WayIcon = "home" | "story" | "contact" | "resume" | "email" | SocialId;
type Drawn = Exclude<WayIcon, SocialId | "resume">;

/* Each profile's own mark, from svglogos.dev (public/logos/social/). */
const MARKS: Record<SocialId, string> = {
  github: "/logos/social/github-icon.svg",
  linkedin: "/logos/social/linkedin-icon.svg",
  x: "/logos/social/x.svg",
};

/**
 * A way's mark: a profile's own logo, or a small drawing of its own. Put
 * inside a link marked `data-icon={icon}`, it plays its trick when the link
 * is pointed at or focused (way-mark.module.css): the globe turns, a page
 * turns, someone types, GitHub hops, LinkedIn waves. The footer, the home
 * page's last chapter and the links to the code all use it, so a way out
 * looks and moves the same everywhere.
 */
export function WayMark({ icon, className }: { icon: WayIcon; className?: string }) {
  const cls = className ? `${s.icon} ${className}` : s.icon;
  if (icon === "resume") return <ResumeMark className={cls} />;
  if (icon === "github" || icon === "linkedin" || icon === "x")
    return (
      <span
        className={`${cls} ${s.logo}`}
        style={{ maskImage: `url(${MARKS[icon]})` }}
        aria-hidden
      />
    );
  return (
    <svg
      className={cls}
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

const DRAWINGS: Record<Drawn, ReactNode> = {
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
