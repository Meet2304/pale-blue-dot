"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Compass } from "@/components/animate-ui/icons/compass";
import { Layers } from "@/components/animate-ui/icons/layers";
import { List } from "@/components/animate-ui/icons/list";
import { Send } from "@/components/animate-ui/icons/send";
import { User } from "@/components/animate-ui/icons/user";
import { LiquidMenu } from "@/components/site/liquid-menu";
import { NAV_ITEMS } from "@/components/site/nav-items";
import { ResumeLink } from "@/components/site/resume-link";

const ICON_SIZE = 15;

const ICONS = {
  "/about": User,
  "/work": Layers,
  "/story": Compass,
  "/contact": Send,
  "/changelog": List,
} as const;

export function SiteNav({ visible }: { visible: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="hz-nav"
        aria-label="Site"
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
                  href={item.href}
                  label={item.label}
                  Icon={ICONS[item.href]}
                  className="hz-nav-link"
                  size={ICON_SIZE}
                  current={pathname === item.href}
                  withIcon={false}
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

type NavLinkProps = {
  href: string;
  label: string;
  Icon: (typeof ICONS)[keyof typeof ICONS];
  current: boolean;
  className: string;
  size: number;
  /**
   * The bar is set in words alone; only the full-screen menu carries icons.
   * Five glyphs beside five one-word labels was decoration on something whose
   * whole job is to be scanned, and at this size the words are already the
   * fastest thing to read.
   */
  withIcon?: boolean;
};

function NavLink({
  href,
  label,
  Icon,
  current,
  className,
  size,
  withIcon = true,
}: NavLinkProps) {
  const [focused, setFocused] = useState(false);

  if (!withIcon) {
    /* No icon means nothing for AnimateIcon to drive, so the wrapper — and the
       focus state it needs — is skipped entirely rather than mounted empty. */
    return (
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={className}
      >
        {label}
      </Link>
    );
  }

  return (
    /* `asChild` is the load-bearing prop. It makes AnimateIcon render a Slot
       that composes its pointer handlers onto the Link itself, so hovering the
       *word* animates the icon. Without it you get a wrapper span, and only the
       icon's own box is the hover target.

       AnimateIcon ships animateOnHover / Tap / View but no animateOnFocus, so
       keyboard users would otherwise get nothing at all. `animate` is a live
       prop (there is an effect on it), and five links re-rendering once per Tab
       is not a hot path. */
    <AnimateIcon asChild animateOnHover animate={focused}>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={className}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Icon className="hz-nav-icon" size={size} />
        <span>{label}</span>
      </Link>
    </AnimateIcon>
  );
}
