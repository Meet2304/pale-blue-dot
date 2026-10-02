"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Menu } from "@/components/animate-ui/icons/menu";
import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { Orbit } from "@/components/animate-ui/icons/orbit";
import { X } from "@/components/animate-ui/icons/x";
import { CONTACT, UNITS, type Kind } from "@/content/work";
import { routes } from "@/lib/routes";

import { FIRST } from "./chapters";
import { KINDS, KIND_ORDER, kindColors } from "./encoding";
import { fit } from "./helpers";
import { Logo } from "./logo";
import { PORTRAITS, type PortraitId } from "./portraits";
import { drawBody, makeFrame } from "./render";
import s from "./universe.module.css";

/**
 * The bar on a phone: the mark, and a menu that opens a drawer from the
 * right with everything in it. The work comes first, by kind, each kind
 * with its own body drawn live beside it, as it is in the universe, so the
 * key to the sky is in the menu itself; a kind opens to its pieces, and a
 * piece flies the page to its chapter. Then the story, a way to say hello,
 * the resume, and the elsewhere links.
 *
 * It closes with its button, a tap outside it, or Escape; while it is open
 * the page beneath holds still, and closing hands focus back to the menu
 * button.
 */
export function Drawer({ goTo }: { goTo: (chapter: number) => void }) {
  const [open, setOpen] = useState(false);
  /* The drawer is put in the page the first time the menu is reached for
     (pointed at, touched or focused), so that it can slide in even the
     first time, and the page as served is the same on every screen. */
  const [ready, setReady] = useState(false);
  const prepare = () => setReady(true);
  const [kind, setKind] = useState<Kind | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      wasOpen.current = false;
      menuRef.current?.focus({ preventScroll: true });
    }
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (chapter: number) => {
    setOpen(false);
    window.setTimeout(() => goTo(chapter), 180);
  };

  return (
    <>
      <AnimateIcon asChild animateOnHover animateOnTap>
        <button
          ref={menuRef}
          type="button"
          className={s.menuButton}
          aria-expanded={open}
          aria-controls="drawer"
          aria-label="Menu"
          onPointerEnter={prepare}
          onPointerDown={prepare}
          onFocus={prepare}
          onClick={() => {
            if (ready) setOpen(true);
            else {
              setReady(true);
              requestAnimationFrame(() => setOpen(true));
            }
          }}
        >
          <Menu size={20} aria-hidden />
        </button>
      </AnimateIcon>

      {ready &&
        createPortal(
          <>
            <div
              className={s.drawerScrim}
              data-open={open}
              aria-hidden
              onClick={() => setOpen(false)}
              onTouchMove={(e) => e.preventDefault()}
            />
            <aside
              id="drawer"
              className={s.drawer}
              data-open={open}
              inert={!open}
              aria-label="Menu"
            >
              <div className={s.drawerHead}>
                <button type="button" className={s.drawerBrand} onClick={() => go(0)}>
                  <Logo />
                  <span className={s.srOnly}>Meet Bhatt: back to the top</span>
                </button>
                <AnimateIcon asChild animateOnHover animateOnTap>
                  <button
                    ref={closeRef}
                    type="button"
                    className={s.drawerClose}
                    onClick={() => setOpen(false)}
                  >
                    <X size={14} aria-hidden /> close
                  </button>
                </AnimateIcon>
              </div>

              <p className={s.drawerLabel}>The work</p>
              <ul className={s.drawerKinds}>
                {KIND_ORDER.map((k) => {
                  const units = UNITS.filter((u) => u.kind === k);
                  const c = kindColors(k);
                  const expanded = kind === k;
                  return (
                    <li
                      key={k}
                      style={{ "--kind": c[2], "--kind-soft": c[3] } as CSSProperties}
                    >
                      <button
                        type="button"
                        className={s.drawerKind}
                        aria-expanded={expanded}
                        onClick={() => setKind(expanded ? null : k)}
                      >
                        <Thumb kind={k} live={open} />
                        <span className={s.drawerKindText}>
                          <span className={s.drawerKindName}>{KINDS[k].label}</span>
                          <span className={s.drawerKindBody}>
                            {KINDS[k].mark} {KINDS[k].bodyName}, {units.length}
                          </span>
                        </span>
                        <span className={s.drawerChevron} aria-hidden>
                          {expanded ? "−" : "+"}
                        </span>
                      </button>
                      <div
                        className={s.drawerPieces}
                        data-open={expanded}
                        inert={!expanded}
                      >
                        <ul>
                          {units.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                onClick={() => go(FIRST + UNITS.indexOf(u))}
                              >
                                <span>{u.name}</span>
                                <span className={s.drawerWhen}>{u.when}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <nav className={s.drawerLinks} aria-label="More">
                <AnimateIcon asChild animateOnHover animateOnTap>
                  <Link href={routes.story} onClick={() => setOpen(false)}>
                    <Orbit size={16} aria-hidden />
                    story
                  </Link>
                </AnimateIcon>
                <AnimateIcon asChild animateOnHover animateOnTap>
                  <Link href={routes.contact} onClick={() => setOpen(false)}>
                    <MessageCircle size={16} aria-hidden />
                    say hello
                  </Link>
                </AnimateIcon>
                <AnimateIcon asChild animateOnHover animateOnTap>
                  <a href={CONTACT.resume} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden />
                    resume
                  </a>
                </AnimateIcon>
              </nav>
              <p className={s.drawerElse}>
                <a href={CONTACT.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </p>
            </aside>
          </>,
          /* In the page's root, outside the bar: the bar is positioned with
             a translate, which would pin a fixed drawer to it. */
          document.getElementById("content") ?? document.body,
        )}
    </>
  );
}

/* A kind's body, small and live: the same portrait the bar's panels draw,
   turning slowly while the drawer is open. */
function Thumb({ kind, live }: { kind: Kind; live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g || !live) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const body = KINDS[kind].body as PortraitId;
    const portrait = PORTRAITS[body];
    const colors = kindColors(kind);
    const mono =
      getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    const { w, h, dpr } = fit(canvas, 2);
    const [rx, ry] = portrait.reach;
    const R = Math.min(w / 2 / rx, h / 2 / ry) * 0.92;
    const cw = portrait.cell ? Math.max(2.4, portrait.cell * 0.6) : 2.2;
    const ch = cw * 1.72;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      /* A dozen frames a second is plenty for a body this small. */
      if (now - last < 80) return;
      last = now;
      const t = calm ? 0 : now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const light = { cx: w / 2, cy: h / 2, R, colors, alpha: 1, t, calm };
      portrait.under?.(g, light);
      drawBody(g, body, {
        w,
        h,
        cx: w / 2,
        cy: h / 2,
        R,
        cw,
        ch,
        frame: makeFrame(t, t * 0.3, 0.35, null, cw / R, ch / R, 0.4, calm),
        colors,
        alpha: 1,
        font: `${ch * 0.92}px ${mono}`,
        fn: portrait.fn,
        extent: portrait.extent,
        light: portrait.mapLight ?? false,
      });
      portrait.over?.(g, light);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind, live]);

  return <canvas ref={ref} className={s.thumb} aria-hidden />;
}
