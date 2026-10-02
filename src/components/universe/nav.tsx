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

import { hash, type Cell } from "./bodies";
import { KINDS, KIND_ORDER, kindColors } from "./encoding";
import { fit, mulberry32 } from "./helpers";
import { Drawer } from "./drawer";
import { GLYPHS } from "./intro-timeline";
import { Logo } from "./logo";
import { PORTRAITS, type PortraitId } from "./portraits";
import { drawBody, makeFrame } from "./render";
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

  return (
    <header
      ref={headerRef}
      className={s.nav}
      data-docked={docked}
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
            <Viewer open={open} kind={kind} />

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

/* The kind's body, live, over a field of stars. Switching kinds with the
   panel open morphs one body into the other rather than starting over: every
   glyph cell hands over from the old body to the new one through a moment
   of scramble, the change spreading out from the centre, while their light
   passes from one to the other. */
const MORPH = 520;

function Viewer({ open, kind }: { open: boolean; kind: Kind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  /* Which body is showing, and which it is becoming. */
  const morph = useRef({ from: kind, to: kind, at: 0 });

  useEffect(() => {
    const m = morph.current;
    if (m.to === kind) return;
    morph.current = { from: m.to, to: kind, at: open ? performance.now() : 0 };
  }, [kind, open]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!open || !canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Opening shows the current body without a morph. */
    morph.current = { from: morph.current.to, to: morph.current.to, at: 0 };
    const rnd = mulberry32(29);
    const stars = Array.from({ length: 360 }, () => ({
      x: rnd(),
      y: rnd(),
      b: 0.2 + rnd() ** 3 * 0.8,
      p: rnd() * 6.28,
      r: 0.6 + rnd() * 1.6,
    }));
    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let lift = 0;
    const pointer = { x: -1e4, y: -1e4, in: false };
    const opened = performance.now();
    let raf = 0;

    const measure = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    };

    /* A body's portrait, and its size in this frame. */
    const sized = (k: Kind, grow: number) => {
      const portrait = PORTRAITS[KINDS[k].body as PortraitId];
      const [rx, ry] = portrait.reach;
      const R =
        Math.min(w / 2 / rx, h / 2 / ry) *
        0.88 *
        (0.5 + 0.5 * grow) *
        (1 + 0.05 * lift);
      const cw = portrait.cell ?? Math.max(2.6, Math.min(3.8, R * 0.022 + 0.6));
      return {
        portrait,
        R,
        cw,
        colors: kindColors(k),
        body: KINDS[k].body as PortraitId,
      };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);

      lift = calm ? (pointer.in ? 1 : 0) : lift + ((pointer.in ? 1 : 0) - lift) * 0.12;
      const k0 = calm ? 1 : Math.min(1, (now - opened) / 650);
      const grow = k0 * k0 * (3 - 2 * k0);
      const { from, to, at } = morph.current;
      const mRaw = calm || !at ? 1 : Math.min(1, (now - at) / MORPH);
      if (mRaw >= 1 && from !== to) morph.current = { from: to, to, at: 0 };
      const m = mRaw * mRaw * (3 - 2 * mRaw);

      const next = sized(to, grow);
      const prev = from !== to ? sized(from, grow) : null;
      const cx = w / 2;
      const cy = h / 2;
      const { R, cw } = next;
      const ch = cw * 1.72;
      const alpha = grow * (0.82 + 0.18 * lift);
      const scan =
        pointer.in && Math.hypot(pointer.x - cx, pointer.y - cy) < R * 2
          ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: 0.42 }
          : null;

      /* The sky behind, even across the whole viewer. Around a black hole
         it is lensed: each star is seen pushed outward from the hole (the
         outer image of a point lens), and stretched round it into a short
         arc, the more the closer it lies. */
      const lensR =
        ((next.portrait.lens ?? 0) * next.R * (prev ? m : 1) +
          (prev ? (prev.portrait.lens ?? 0) * prev.R * (1 - m) : 0)) *
        (0.6 + 0.4 * grow);
      g.fillStyle = "#dfe6f5";
      g.strokeStyle = "#dfe6f5";
      g.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        /* Most viewers show a sparser sky; the black hole gets it all. */
        if (i >= 140 && lensR < 1) continue;
        const a = st.b * (calm ? 0.6 : 0.4 + 0.3 * Math.sin(t * st.r + st.p));
        let x = st.x * w;
        let y = st.y * h;
        if (lensR < 1) {
          g.globalAlpha = a;
          g.fillRect(x, y, 1.1, 1.1);
          continue;
        }
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const seen = (d + Math.sqrt(d * d + 4 * lensR * lensR)) / 2;
        x = cx + (dx / d) * seen;
        y = cy + (dy / d) * seen;
        const stretch = Math.min(18, (seen / d - 1) * 3);
        g.globalAlpha = Math.min(
          1,
          a * (1 + stretch * 0.08) * (i >= 140 ? Math.min(1, lensR / 40) : 1),
        );
        if (stretch < 0.6) {
          g.fillRect(x, y, 1.1, 1.1);
        } else {
          const ang = Math.atan2(dy, dx) + Math.PI / 2;
          const half = stretch / 2;
          g.beginPath();
          g.moveTo(x - Math.cos(ang) * half, y - Math.sin(ang) * half);
          g.lineTo(x + Math.cos(ang) * half, y + Math.sin(ang) * half);
          g.stroke();
        }
      }
      g.globalAlpha = 1;

      /* Light passes from one body to the other. */
      const lightOf = (b: ReturnType<typeof sized>, share: number) => ({
        cx,
        cy,
        R: b.R,
        colors: b.colors,
        alpha: alpha * share,
        t,
        calm,
      });
      if (prev) prev.portrait.under?.(g, lightOf(prev, 1 - m));
      next.portrait.under?.(g, lightOf(next, prev ? m : 1));

      const frameFor = (b: ReturnType<typeof sized>) =>
        makeFrame(
          t,
          t * 0.3,
          0.35,
          scan && { ...scan, x: scan.x * (R / b.R), y: scan.y * (R / b.R) },
          cw / b.R,
          ch / b.R,
          0.4,
          calm,
        );
      const fNext = frameFor(next);

      if (!prev) {
        drawBody(g, next.body, {
          w,
          h,
          cx,
          cy,
          R,
          cw,
          ch,
          frame: fNext,
          colors: next.colors,
          alpha,
          font: `${ch * 0.92}px ${mono}`,
          fn: next.portrait.fn,
          extent: next.portrait.extent,
          light: next.portrait.mapLight ?? false,
        });
      } else {
        /* The morph: one pass over the grid, each cell showing the old body,
           the new one, or (at the moving edge between them) a scrambled
           glyph. The edge sweeps out from the centre, with some grain, so
           the new body grows through the old. The old body's colours are
           the second seven. */
        const fPrev = frameFor(prev);
        const sp = R / prev.R;
        const reachPrev = prev.portrait.extent * (prev.R / R);
        const extent = Math.max(next.portrait.extent, reachPrev);
        const band = 0.12;
        const sweep = m * (1 + 2 * band) - band;
        const both = (nx: number, ny: number, id: number, _f: unknown, o: Cell) => {
          const order =
            0.6 * hash(id, 77) + 0.4 * Math.min(1, Math.hypot(nx, ny) / extent);
          if (order < sweep - band) return next.portrait.fn(nx, ny, id, fNext, o);
          if (order > sweep + band) {
            if (!prev.portrait.fn(nx * sp, ny * sp, id, fPrev, o)) return false;
            o.k += 7;
            return true;
          }
          const hit =
            next.portrait.fn(nx, ny, id, fNext, o) ||
            (prev.portrait.fn(nx * sp, ny * sp, id, fPrev, o) && ((o.k += 7), true));
          if (!hit) return false;
          o.c = GLYPHS[Math.floor(hash(id, Math.floor(t * 30)) * GLYPHS.length)];
          return true;
        };
        drawBody(g, next.body, {
          w,
          h,
          cx,
          cy,
          R,
          cw,
          ch,
          frame: fNext,
          colors: [...next.colors, ...prev.colors],
          alpha,
          font: `${ch * 0.92}px ${mono}`,
          fn: both,
          extent,
          light: false,
        });
      }

      if (prev) prev.portrait.over?.(g, lightOf(prev, 1 - m));
      next.portrait.over?.(g, lightOf(next, prev ? m : 1));

      /* The reticle: four ticks, no circle, as on the map. */
      if (lift > 0.02) {
        const [rx, ry] = next.portrait.reach;
        const ax = Math.min(w * 0.46, R * rx * 1.05);
        const ay = Math.min(h * 0.44, R * ry * 1.1);
        const tick = 8;
        g.strokeStyle = next.colors[3];
        g.globalAlpha = lift * 0.85;
        g.lineWidth = 1;
        g.beginPath();
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = cx + dx * ax;
          const y = cy + dy * ay;
          g.moveTo(x, y);
          g.lineTo(x - dx * tick, y);
          g.moveTo(x, y);
          g.lineTo(x, y - dy * tick);
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    };

    measure();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.in = true;
    };
    const onLeave = () => {
      pointer.in = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [open]);

  return (
    <div className={s.viewer}>
      <canvas ref={ref} className={s.viewerCanvas} aria-hidden />
    </div>
  );
}
