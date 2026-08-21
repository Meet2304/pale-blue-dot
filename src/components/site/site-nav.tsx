"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Compass } from "@/components/animate-ui/icons/compass";
import { Download } from "@/components/animate-ui/icons/download";
import { Layers } from "@/components/animate-ui/icons/layers";
import { Menu } from "@/components/animate-ui/icons/menu";
import { Send } from "@/components/animate-ui/icons/send";
import { User } from "@/components/animate-ui/icons/user";
import { X } from "@/components/animate-ui/icons/x";

/** The one shape every Animate UI icon satisfies; the rest of their props are optional. */
type NavIcon = ComponentType<{ className?: string; size?: number }>;

/**
 * The site's whole internal link graph, in four single words.
 *
 * Single words because the bar is a tool, not a statement — "Story" rather than
 * "The Note", "Work" rather than "Selected Projects". Compass for the story
 * page: it is the page about direction, and the star was already spoken for
 * (in this project's vocabulary a star is a piece of work).
 */
const NAV_ITEMS: readonly { href: string; label: string; Icon: NavIcon }[] = [
  { href: "/about", label: "About", Icon: User },
  { href: "/work", label: "Work", Icon: Layers },
  { href: "/story", label: "Story", Icon: Compass },
  { href: "/contact", label: "Contact", Icon: Send },
];

/**
 * Flip this — and drop the file at `public/resume.pdf` — when the resume is
 * ready, then delete `src/app/resume/page.tsx`. Until then the control points
 * at a real route rather than at a missing file: an `<a download>` aimed at a
 * 404 navigates away silently, which is a worse failure than an honest page.
 */
const RESUME_READY = false;
const RESUME_HREF = RESUME_READY ? "/resume.pdf" : "/resume";

const ICON_SIZE = 15;
const PANEL_ICON_SIZE = 20;

/** 60ms apart reads as one list arriving, not four separate events. */
const PANEL_STAGGER_MS = 60;

export function SiteNav({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  /* Both of these adjust state during render rather than from an effect, which
     is React's documented pattern for "reset when something upstream changed"
     and avoids the extra render pass an effect would cost.

     The first: any navigation dismisses the menu. Next keeps the layout mounted
     across route changes, so without it the panel would still be sitting open
     over the page it just took you to — and unlike an onClick on each link,
     this also catches the back button.

     The second: scrolling back up into the warp with the menu open would leave
     a full-screen panel hanging over the flight. */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  if (open && !visible) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const opener = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      /* Focus stays inside the panel while it is open. Queried live rather than
         cached: the list is five items long, and keeping a stale node list
         correct across re-renders would cost more than the query does. */
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      /* Back to what opened it, rather than to the top of the document —
         otherwise dismissing the menu costs a full re-tab. */
      opener?.focus();
    };
  }, [open, close]);

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
                  withIcon={false}
                />
              </li>
            ))}
          </ul>

          <ResumeLink size={ICON_SIZE} />

          <AnimateIcon asChild animateOnHover>
            <button
              ref={triggerRef}
              type="button"
              className="hz-nav-trigger"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(true)}
            >
              <Menu className="hz-nav-icon" size={ICON_SIZE + 3} />
            </button>
          </AnimateIcon>
        </div>
      </nav>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="hz-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Primary"
        >
          <div className="hz-nav-panel-head">
            <AnimateIcon asChild animateOnHover>
              <button
                ref={closeRef}
                type="button"
                className="hz-nav-trigger"
                aria-label="Close menu"
                onClick={close}
              >
                <X className="hz-nav-icon" size={ICON_SIZE + 3} />
              </button>
            </AnimateIcon>
          </div>

          <div className="hz-nav-panel-body">
            <ul className="hz-nav-panel-list">
              {NAV_ITEMS.map((item, i) => (
                <li key={item.href}>
                  <NavLink
                    {...item}
                    className="hz-nav-panel-link"
                    size={PANEL_ICON_SIZE}
                    current={pathname === item.href}
                    delayMs={i * PANEL_STAGGER_MS}
                  />
                </li>
              ))}
            </ul>

            <ResumeLink
              size={PANEL_ICON_SIZE}
              delayMs={NAV_ITEMS.length * PANEL_STAGGER_MS}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * `.hz-rise` is the system's only entrance. The panel's items use it with a
 * stagger; the bar's own items do not animate individually — the bar arrives as
 * one object, which is what `.hz-nav`'s own transition is for.
 *
 * 520ms rather than the class's 1100ms default: that budget belongs to the hero.
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
  /**
   * The bar is set in words alone; only the full-screen menu carries icons.
   * Four glyphs beside four one-word labels was decoration on something whose
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
  delayMs,
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
        {...entrance(delayMs, className)}
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

/** Matches `inset: -14px` on .hz-resume-glow, so the mapping stays exact. */
const GLOW_INSET = 14;

function ResumeLink({ size, delayMs }: { size: number; delayMs?: number }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  /* Written straight to the node rather than held in state: this fires on every
     pointer move across the control, and the repo's rule is that nothing in a
     hot path costs a render. The glow element is inset past the button, so the
     pointer's position has to be remapped onto that larger box or the light
     would lag the cursor toward the edges. */
  const track = (event: PointerEvent<HTMLAnchorElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left + GLOW_INSET;
    const span = rect.width + GLOW_INSET * 2;
    node.style.setProperty("--hz-glow-x", `${((x / span) * 100).toFixed(2)}%`);
  };

  const recentre = () => {
    ref.current?.style.setProperty("--hz-glow-x", "50%");
  };

  return (
    /* The starry ground and the bloom are entirely CSS on .hz-resume — see
       nav.css. All this has to do is be one hover target, which is what lets
       AnimateIcon slot onto it and animate the arrow from anywhere inside. */
    <AnimateIcon asChild animateOnHover animate={focused}>
      <Link
        ref={ref}
        href={RESUME_HREF}
        onPointerMove={track}
        onPointerLeave={recentre}
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
