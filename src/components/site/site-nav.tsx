"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { LiquidMenu } from "@/components/site/liquid-menu";
import {
  NAV_ITEMS,
  RESUME_HREF,
  RESUME_READY,
  type NavIcon,
} from "@/components/site/nav-items";

const ICON_SIZE = 15;

export function SiteNav({ visible }: { visible: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="hz-nav"
        aria-label="Primary"
        data-nav={visible ? "visible" : "hidden"}
        /* `visibility: hidden` already takes the links out of the tab order;
           `inert` covers the 420ms while the bar is fading out and still
           visible, and any browser where a child subverts the inheritance. */
        inert={!visible}
      >
        <div className="hz-nav-inner">
          <Link href="/" className="hz-nav-mark">
            <span className="hz-nav-dot" aria-hidden />
            Meet Bhatt
          </Link>

          <ul className="hz-nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  {...item}
                  className="hz-nav-link"
                  size={ICON_SIZE}
                  current={pathname === item.href}
                />
              </li>
            ))}
          </ul>

          <ResumeLink size={ICON_SIZE} />
        </div>
      </nav>

      <LiquidMenu visible={visible} />
    </>
  );
}

/**
 * `.hz-rise` is the system's only entrance. The bar's own items do not animate
 * individually — the bar arrives as one object, which is what `.hz-nav`'s own
 * transition is for.
 */
function entrance(delayMs: number | undefined, className: string) {
  if (delayMs === undefined) return { className };
  return {
    className: `${className} hz-rise`,
    style: {
      "--hz-delay": `${delayMs}ms`,
      "--hz-dur": "520ms",
    } as CSSProperties,
  };
}

type NavLinkProps = {
  href: string;
  label: string;
  Icon: NavIcon;
  current: boolean;
  className: string;
  size: number;
  delayMs?: number;
};

function NavLink({
  href,
  label,
  Icon,
  current,
  className,
  size,
  delayMs,
}: NavLinkProps) {
  const [focused, setFocused] = useState(false);

  return (
    /* `asChild` is the load-bearing prop. It makes AnimateIcon render a Slot
       that composes its pointer handlers onto the Link itself, so hovering the
       *word* animates the icon. Without it you get a wrapper span, and only the
       icon's own box is the hover target.

       AnimateIcon ships animateOnHover / Tap / View but no animateOnFocus, so
       keyboard users would otherwise get nothing at all. `animate` is a live
       prop (there is an effect on it), and four links re-rendering once per Tab
       is not a hot path. */
    <AnimateIcon asChild animateOnHover animate={focused}>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...entrance(delayMs, className)}
      >
        <Icon className="hz-nav-icon" size={size} />
        <span>{label}</span>
      </Link>
    </AnimateIcon>
  );
}

function ResumeLink({ size, delayMs }: { size: number; delayMs?: number }) {
  const [focused, setFocused] = useState(false);

  return (
    /* The starry ground and the bloom are entirely CSS on .hz-resume — see
       nav.css. All this has to do is be one hover target, which is what lets
       AnimateIcon slot onto it and animate the arrow from anywhere inside. */
    <AnimateIcon asChild animateOnHover animate={focused}>
      <Link
        href={RESUME_HREF}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...(RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
        {...entrance(delayMs, "hz-resume")}
      >
        <span className="hz-resume-glow" aria-hidden />
        <Download className="hz-nav-icon" size={size} />
        <span>Resume</span>
      </Link>
    </AnimateIcon>
  );
}
