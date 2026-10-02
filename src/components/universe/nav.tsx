"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";

import { CONTACT, UNITS, type Kind } from "@/content/work";
import { routes } from "@/lib/routes";

import { Drawer } from "./drawer";
import { KINDS, KIND_ORDER, kindColors } from "./encoding";
import { whenIdle } from "./helpers";
import { GLYPHS } from "./intro-timeline";
import { KindViewer, loadKindArt } from "./kind-art-lazy";
import { Logo } from "./logo";
import s from "./universe.module.css";

/**
 * The bar across the top of the universe, with a tab for each kind of work.
 *
 * Each tab opens a panel for its kind: the kind's body, drawn large and in
 * detail (portraits.ts) so it reads as what it is with no map around it,
 * beside the kind's name, why that body stands for it, and the work itself.
 * The body resolves out of a point of light as the panel opens; hovering it
 * brings it up, frames it with the four-tick reticle, and the scanner
 * follows the pointer across it to show its hidden structure.
 *
 * Moving along the tabs with the panel open morphs it from one kind to the
 * next rather than swapping it: one panel serves every tab; the body morphs
 * glyph by glyph into the next, the words scramble into the next kind's
 * words, and the panel's height glides to fit.
 */

const kindVars = (k: Kind) => {
  const c = kindColors(k);
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

/* How long the panel waits before opening on hover, and before closing when
   the pointer leaves: long enough that passing over the bar, or cutting a
   corner on the way into the panel, doesn't flicker it. */
const OPEN_DELAY = 90;
const CLOSE_DELAY = 240;

export function UniverseNav({
  goTo,
  docked,
}: {
  goTo: (chapter: number) => void;
  /** Past the hero: the bar docks to the top edge (see `.nav`). */
  docked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>(KIND_ORDER[0]);
  const panelId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const timer = useRef(0);

  const later = useCallback((next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  }, []);
  const hold = useCallback(() => window.clearTimeout(timer.current), []);

  /* Escape closes and hands focus back to the tab; so does a click
     elsewhere, or a scroll, since the sky is about to move under it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      const tab = headerRef.current?.querySelector<HTMLElement>(`[data-tab="${kind}"]`);
      const phone = headerRef.current?.querySelector<HTMLElement>(`[data-tab="phone"]`);
      (tab && tab.offsetParent ? tab : phone)?.focus();
    };
    const onScroll = () => setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, kind]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* The panels' bodies are fetched once the page is idle, so they are
     there by the time a tab is first pointed at. */
  useEffect(() => whenIdle(() => void loadKindArt(), 4000), []);

  return (
    <header
      ref={headerRef}
      className={s.nav}
      data-docked={docked}
      /* One bar across the pages: it carries over a page change rather
         than going out with one page and in with the next (globals.css). */
      style={{ viewTransitionName: "site-bar" }}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(false, CLOSE_DELAY)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <nav className={s.bar} aria-label="Site">
        <button
          type="button"
          className={s.brand}
          style={{ "--i": 0 } as CSSProperties}
          onClick={() => goTo(0)}
          aria-label="Meet Bhatt: back to the top"
        >
          <Logo />
        </button>

        {KIND_ORDER.map((k, i) => (
          <button
            key={k}
            type="button"
            data-tab={k}
            className={`${s.barItem} ${s.tab}`}
            style={{ ...kindVars(k), "--i": i + 1 } as CSSProperties}
            aria-expanded={open && kind === k}
            aria-controls={panelId}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              setKind(k);
              later(true, open ? 0 : OPEN_DELAY);
            }}
            onClick={() => {
              hold();
              if (open && kind === k) setOpen(false);
              else {
                setKind(k);
                setOpen(true);
              }
            }}
            onKeyDown={(e) => {
              /* Down moves into the panel; left and right along the tabs. */
              const tabs = [
                ...(e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
                  `.${s.tab}`,
                ) ?? []),
              ];
              const i = tabs.indexOf(e.currentTarget);
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const step = e.key === "ArrowRight" ? 1 : tabs.length - 1;
                const next = tabs[(i + step) % tabs.length];
                next?.focus();
                if (open && next) setKind(next.dataset.tab as Kind);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setKind(k);
                setOpen(true);
                window.setTimeout(() => {
                  document
                    .getElementById(panelId)
                    ?.querySelector<HTMLElement>(
                      `.${s.menuInfo} a, .${s.menuInfo} button`,
                    )
                    ?.focus();
                }, 30);
              }
            }}
          >
            <span className={s.mark} aria-hidden>
              {KINDS[k].mark}
            </span>
            {KINDS[k].label.toLowerCase()}
          </button>
        ))}

        <button
          type="button"
          data-tab="phone"
          className={`${s.barItem} ${s.phoneTab}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          work
        </button>

        <span className={s.barGap} />

        <span className={s.barMore} style={{ "--i": 6 } as CSSProperties}>
          <Link className={`${s.barItem} ${s.barWide}`} href={routes.story}>
            story
          </Link>
          {/* Contact, set apart from the pages: a hairline between, and an @
              for its mark, as each kind of work has its own. */}
          <span className={`${s.barRule} ${s.barWider}`} aria-hidden />
          <Link className={`${s.barItem} ${s.barWider}`} href={routes.contact}>
            <span className={s.barAt} aria-hidden>
              @
            </span>
            say hello
          </Link>
        </span>
        <a
          className={s.barCta}
          style={{ "--i": 7 } as CSSProperties}
          href={CONTACT.resume}
          target="_blank"
          rel="noreferrer"
        >
          resume
        </a>
        <Drawer goTo={goTo} />
      </nav>

      <KindMenu id={panelId} open={open} kind={kind} setKind={setKind} hold={hold} />
    </header>
  );
}

/* How long text takes to scramble from one kind's words to the next. */
const SCRAMBLE_MS = 420;

/**
 * Text that morphs when it changes, the terminal's way: left to right, each
 * character passes through a glyph on its way from the old text to the new.
 * The whole new text is always there for screen readers.
 */
function Scramble({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const last = useRef(text);

  useEffect(() => {
    const from = last.current;
    last.current = text;
    if (from === text) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = calm ? 1 : Math.min(1, (now - start) / SCRAMBLE_MS);
      const n = Math.max(from.length, text.length);
      let out = "";
      for (let i = 0; i < n; i++) {
        const at = (i / n) * 0.6;
        const to = text[i] ?? "";
        if (p >= at + 0.4) out += to;
        else if (p >= at)
          out +=
            to === " " || to === ""
              ? to
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        else out += from[i] ?? "";
      }
      setShown(out);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <>
      <span className={s.srOnly}>{text}</span>
      <span aria-hidden>{shown}</span>
    </>
  );
}

function KindMenu({
  id,
  open,
  kind,
  setKind,
  hold,
}: {
  id: string;
  open: boolean;
  kind: Kind;
  setKind: (k: Kind) => void;
  hold: () => void;
}) {
  const info = KINDS[kind];
  const units = UNITS.filter((u) => u.kind === kind);
  /* The panel's height glides between kinds (they hold different numbers
     of pieces of work) instead of jumping. */
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      id={id}
      className={s.menu}
      data-open={open}
      inert={!open}
      style={kindVars(kind)}
      onPointerEnter={hold}
    >
      <div className={s.menuFrame} style={height === null ? undefined : { height }}>
        <div ref={innerRef}>
          {/* On a phone the tabs live here, above the panel. */}
          <div className={s.chips} role="group" aria-label="Kind of work">
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                style={kindVars(k)}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                <span className={s.mark} aria-hidden>
                  {KINDS[k].mark}
                </span>
                {KINDS[k].label.toLowerCase()}
              </button>
            ))}
          </div>

          <div className={s.menuBody}>
            <KindViewer open={open} kind={kind} />

            <div className={s.menuInfo}>
              <p className={s.menuHead}>
                <span className={s.mark} aria-hidden>
                  {info.mark}
                </span>
                <span className={s.menuCount}>
                  <Scramble text={`${units.length} in all`} />
                </span>
              </p>
              <p className={s.menuTitle}>
                <Scramble text={info.title} />
              </p>
              <p className={s.menuAbout}>
                <Scramble text={info.about} />
              </p>

              {/* Rows are kept by position, so each one scrambles from the
                  last kind's piece of work into this kind's. */}
              <ul className={s.menuUnits}>
                {units.map((u, i) => (
                  <li key={i}>
                    <Link href={`${routes.work}/${u.id}`} className={s.menuUnit}>
                      <span className={s.menuUnitName}>
                        <Scramble text={u.name} />
                      </span>
                      <span className={s.menuUnitWhen}>
                        <Scramble text={u.when} />
                      </span>
                      <span className={s.menuUnitBrief}>
                        <Scramble text={u.brief} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <nav className={s.footLinks} aria-label="More">
            <Link href={routes.story}>story</Link>
            <Link href={routes.contact}>say hello</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
