"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Media } from "@/content/work";

import { canSplat, mountSplat } from "./splat";
import s from "./universe.module.css";

type Splat = Extract<Media, { kind: "splat" }>;
type Figure = Extract<Media, { kind: "figure" }>;

/* Whether the splat can run here, asked once: the server, phones, reduced
   motion, Data Saver and browsers without WebGL2 get the photograph. */
let able: boolean | null = null;
const ableNow = () => (able ??= canSplat());
const noop = () => () => {};

/**
 * A photograph rebuilt as a 3D Gaussian splat (splat.ts): drag to walk
 * round it, click and scroll to step in, double-click to go back. The
 * photograph is what the server sends and what shows while the splat
 * loads; the splat fades in over it once drawn. Where it can't run, or
 * fails, the photograph stays.
 */
export function SplatMedia({ media }: { media: Splat }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useSyncExternalStore(noop, ableNow, () => false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  const run = live && !failed;

  useEffect(() => {
    if (!run || !host.current || !canvas.current) return;
    return mountSplat(host.current, canvas.current, {
      src: media.src,
      fov: media.fov,
      focus: media.focus,
      onReady: () => setShown(true),
      onFail: () => setFailed(true),
    });
  }, [run, media.src, media.fov, media.focus]);

  return (
    <figure className={s.media}>
      <div
        ref={host}
        className={s.splat}
        style={{ aspectRatio: `${media.width} / ${media.height}` }}
        data-live={run && shown ? "" : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served as is, like every picture here (picture.tsx) */}
        <img
          src={media.color}
          alt={run && shown ? "" : media.alt}
          width={media.width}
          height={media.height}
          loading="lazy"
          decoding="async"
          className={s.splatStill}
        />
        {run && (
          <canvas
            ref={canvas}
            role="img"
            aria-label={media.alt}
            className={s.splatCanvas}
          />
        )}
      </div>
      {media.caption && <figcaption className={s.caption}>{media.caption}</figcaption>}
    </figure>
  );
}

/**
 * The work drawn as a machine: a figure served whole from public/figures/,
 * in a frame of its own. It loads only when near, pauses itself when off
 * screen, and the frame takes the figure's own height once it has loaded.
 */
export function FigureMedia({ media }: { media: Figure }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  /* Near: within two screens. The frame is lazy until then, and from then
     on it loads: left to the browser, a phone's lazy loading started it
     only as it came on screen, so the figure arrived late and still. */
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "200% 0px 200% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Watch the figure's body: its own height, not the document's, which is
     never less than the frame it sits in. The frame may have loaded before
     this ran (it is lazy, and can beat hydration), so look first, then
     wait for the load. */
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let watch: ResizeObserver | null = null;
    const attach = () => {
      const doc = el.contentDocument;
      if (!doc?.body || watch) return;
      watch = new ResizeObserver(() =>
        setHeight(Math.ceil(doc.body.getBoundingClientRect().height)),
      );
      watch.observe(doc.body);
    };
    if (
      el.contentDocument?.readyState === "complete" &&
      el.contentDocument.body?.childElementCount
    )
      attach();
    el.addEventListener("load", attach);
    return () => {
      el.removeEventListener("load", attach);
      watch?.disconnect();
    };
  }, []);

  return (
    <figure className={s.media}>
      <iframe
        ref={frame}
        src={media.src}
        title={media.title}
        loading={near ? "eager" : "lazy"}
        className={s.figureFrame}
        style={height ? { height } : undefined}
      />
      {media.caption && <figcaption className={s.caption}>{media.caption}</figcaption>}
    </figure>
  );
}
