"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Compass } from "@/components/animate-ui/icons/compass";
import { Layers } from "@/components/animate-ui/icons/layers";
import { Link as LinkIcon } from "@/components/animate-ui/icons/link";
import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { Send } from "@/components/animate-ui/icons/send";
import { User } from "@/components/animate-ui/icons/user";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

/**
 * The end of the page.
 *
 * The dot field is not a band any more — it is the footer's ground, filling the
 * whole block, solid at the bottom edge and fading out toward the top. The
 * links, the icon row and the small print sit on top of it, placed down that
 * fade so each one has thin dots behind it rather than a dense grid.
 *
 * The order is the point. The links are the only thing here anyone needs, so
 * they sit highest and clearest; the name is atmosphere and is tuned to be read
 * after them, which is why the word is dimmer than the grid it sits in rather
 * than brighter.
 */

type FooterIcon = ComponentType<{ className?: string; size?: number }>;

const PAGES = [
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/story", label: "Story" },
  { href: "/contact", label: "Contact" },
  { href: "/changelog", label: "Changelog" },
  { href: "/resume", label: "Resume" },
];

/**
 * Every icon goes somewhere real. The reference row had six, but Animate UI's
 * catalogue has no share, globe, feather, github or linkedin — and padding the
 * row out with icons that mean nothing would have been worse than a short one.
 */
const ELSEWHERE: { href: string; label: string; Icon: FooterIcon }[] = [
  { href: "https://github.com/", label: "GitHub", Icon: LinkIcon },
  { href: "https://www.linkedin.com/", label: "LinkedIn", Icon: User },
  { href: "mailto:meetbhatt2304@gmail.com", label: "Email", Icon: Send },
  { href: "/contact", label: "Contact", Icon: MessageCircle },
  { href: "/work", label: "Work", Icon: Layers },
  { href: "/story", label: "Story", Icon: Compass },
];

export function SiteFooter() {
  /* The word is measured against the container, and the container's usable
     width is whatever the field mask leaves behind — which is far narrower in
     proportion on a phone. One breakpoint, one number: `fitWidth` is the only
     thing here that CSS cannot express, because it is an argument to a canvas
     measurement rather than a style. */
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <footer
      /* The bottom edge blur watches for this and gets out of the way. */
      data-site-footer
      style={{
        position: "relative",
        zIndex: 1,
        background: "transparent",
        paddingTop: "var(--space-8)",
      }}
    >
      <div aria-hidden className="hz-foot-field">
        <FlickeringGrid
          text="MEET BHATT"
          /* The body sans, not the ultra-condensed hero face: at dot-matrix
             resolution Anton's counters close up and the word turns into a bar.
             Set in caps, where every glyph is a shape a 5px grid can resolve. */
          fontFamily="var(--font-text), sans-serif"
          fontWeight={600}
          fitWidth={narrow ? 0.92 : 0.7}
          letterSpacing="0.06em"
          /* Low in the block: under the icon row, above the small print. */
          textY={0.64}
          squareSize={2}
          gridGap={3}
          /* Deliberately inverted from the obvious arrangement: the field is
             brighter than the word inside it. The word is a watermark, not a
             headline. Capping the word's ceiling rather than raising its floor
             keeps its flicker range intact while pulling the whole thing down;
             raising the floor would have flattened it into a solid block. */
          color="var(--ink-400)"
          maxOpacity={0.62}
          textColor="var(--ink-200)"
          textMinOpacity={0.28}
          textMaxOpacity={0.54}
          flickerChance={0.12}
          /* The one place the page answers back. Cells under the cursor lift
             toward --ink-200; the light sets a floor rather than replacing the
             flicker, so a bright cell inside it stays bright and the field keeps
             breathing underneath. */
          haloRadius={narrow ? 96 : 140}
          haloOpacity={0.8}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "0 var(--gutter)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-5)",
        }}
      >
        <nav aria-label="Footer" className="hz-foot-nav">
          {PAGES.map((item) => (
            <Link key={item.href} href={item.href} className="hz-foot-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <ul className="hz-foot-icons">
          {ELSEWHERE.map((item) => (
            <li key={item.label}>
              <FooterIconLink {...item} />
            </li>
          ))}
        </ul>

        {/* The room the name needs, held open by the layout rather than by a
            fixed height on the canvas — so the word cannot collide with the
            small print when the type scale moves. */}
        <div aria-hidden style={{ height: "clamp(4.5rem, 12vw, 9rem)" }} />

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "var(--text-caption)",
            paddingBottom: "var(--space-6)",
          }}
        >
          Made by Humans, on Earth
        </p>
      </div>
    </footer>
  );
}

function FooterIconLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: FooterIcon;
}) {
  const [focused, setFocused] = useState(false);
  const external = href.startsWith("http");
  const mail = href.startsWith("mailto:");

  const shared = {
    className: "hz-foot-icon",
    "aria-label": label,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  /* Same rule as the nav: AnimateIcon wraps the anchor rather than the glyph,
     so the whole 36px target is the trigger. `animate` covers the keyboard,
     which animateOnHover alone does not — Animate UI ships no animateOnFocus. */
  return (
    <AnimateIcon asChild animateOnHover animate={focused}>
      {external || mail ? (
        <a
          href={href}
          {...shared}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
        >
          <Icon size={18} />
        </a>
      ) : (
        <Link href={href} {...shared}>
          <Icon size={18} />
        </Link>
      )}
    </AnimateIcon>
  );
}
