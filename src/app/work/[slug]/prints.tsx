"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";

import { useLightbox } from "@/components/universe/lightbox-lazy";
import { Picture } from "@/components/universe/picture";
import type { Snapshot } from "@/content/work";

import j from "./journey.module.css";

/* At rest each print sits a little askew, each its own way, as prints laid
   on a table do. */
const TILT = [-1.4, 0.9, -0.6, 1.2, -1, 0.5];

/** Who's who in the photographs: a person's id to their name. */
export type Names = Record<string, string>;
type Face = NonNullable<Snapshot["faces"]>[number];

/** Near: within two screens. From then on its pictures are fetched.
    (`from` starts it near: what's on the first screen.) */
export function useNear(ref: RefObject<HTMLElement | null>, from = false) {
  const [near, setNear] = useState(from);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
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
  }, [ref, near]);
  return near;
}

/**
 * A day's photographs, laid out as prints: in rows of one height, each
 * print in its own shape, as many to a row as `rows` says (all in one if
 * it doesn't). They develop in the first time their day is read, one after
 * another, out of a white blur into colour, as a print does in the tray.
 *
 * Under the pointer a print straightens, lifts and leans towards it, and a
 * sheen follows the pointer across it. Where the people in it are placed,
 * the face nearest the pointer is framed and named, as the sky frames a
 * body; a name pointed at elsewhere (`focus`) is framed the same way.
 * Clicked, a print opens up (lightbox.tsx), and the day's photos can be
 * stepped through.
 */
export function Prints({
  photos,
  rows,
  shown,
  focus = null,
  names,
  sizes,
  first = false,
  className,
}: {
  photos: Snapshot[];
  rows?: number[];
  /** Whether they've developed: their day has been read. */
  shown: boolean;
  /** On the first screen: fetched with the page, ahead of everything. */
  first?: boolean;
  /** Someone pointed at elsewhere, framed where they appear. */
  focus?: string | null;
  names: Names;
  /** How wide a print is shown, as for `<img sizes>`. */
  sizes: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNear(ref, first);
  const [open, setOpen] = useState<{ at: number; from: DOMRect | null } | null>(null);
  /* The zoom view, fetched once the prints are near (lightbox-lazy.ts). */
  const Lightbox = useLightbox(near);

  /* What opened the lightbox gets focus back when it closes. */
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open || !opener.current) return;
    opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [open]);

  const counts = rows ?? [photos.length];
  const lines = counts.map((n, r) => {
    const from = counts.slice(0, r).reduce((t, c) => t + c, 0);
    return photos.slice(from, from + n).map((p, i) => ({ p, i: from + i }));
  });

  return (
    <div
      ref={ref}
      className={`${j.prints} ${className ?? ""}`}
      data-shown={shown || undefined}
    >
      {lines.map((line, r) => {
        const sum = line.reduce((t, { p }) => t + p.width / p.height, 0);
        return (
          <div
            key={r}
            className={j.row}
            data-tall={sum < 1 || undefined}
            style={{ "--sum": sum } as CSSProperties}
          >
            {line.map(({ p, i }) => (
              <Print
                key={p.src}
                photo={p}
                index={i}
                focus={focus}
                names={names}
                near={near}
                first={first}
                sizes={sizes}
                hidden={open?.at === i}
                onOpen={(el) => {
                  opener.current = el;
                  setOpen({ at: i, from: el.getBoundingClientRect() });
                }}
              />
            ))}
          </div>
        );
      })}
      {open && Lightbox && (
        // eslint-disable-next-line react-hooks/static-components -- not made here: the lightbox module's own export, the same on every render, held once fetched (lightbox-lazy.ts)
        <Lightbox
          media={{ kind: "album", photos }}
          start={open.at}
          from={open.from}
          live={false}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Print({
  photo,
  index,
  focus,
  names,
  near,
  first,
  sizes,
  hidden,
  onOpen,
}: {
  photo: Snapshot;
  index: number;
  focus: string | null;
  names: Names;
  near: boolean;
  first: boolean;
  sizes: string;
  hidden: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  /* The face nearest the pointer, if the pointer is near one. */
  const [hover, setHover] = useState<string | null>(null);
  const faces = photo.faces;
  const who = hover ?? (focus && faces?.some((f) => f.who === focus) ? focus : null);
  const face = faces?.find((f) => f.who === who) ?? null;
  const aspect = photo.width / photo.height;

  const lean = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    if (faces) {
      let best: string | null = null;
      let near = Infinity;
      for (const f of faces) {
        const d =
          Math.hypot((x - f.x) * box.width, (y - f.y) * box.height) / (f.r * box.width);
        if (d < near) {
          near = d;
          best = f.who;
        }
      }
      setHover(near < 2.8 ? best : null);
    }
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.dataset.lean = "true";
  };
  const rest = () => {
    setHover(null);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.dataset.lean = "false";
  };

  return (
    <button
      ref={ref}
      type="button"
      className={j.print}
      style={
        {
          "--i": index,
          "--tilt": `${TILT[index % TILT.length]}deg`,
          "--ar": aspect,
          visibility: hidden ? "hidden" : undefined,
        } as CSSProperties
      }
      data-framed={face ? "" : undefined}
      onPointerMove={lean}
      onPointerLeave={rest}
      onClick={() => {
        rest();
        if (ref.current) onOpen(ref.current);
      }}
      aria-label={`Enlarge: ${photo.alt}`}
    >
      <Picture
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        load={near}
        first={first}
        className={j.printImg}
      />
      {faces && <Frame face={face} name={who ? (names[who] ?? "") : ""} />}
      <span className={j.sheen} aria-hidden />
    </button>
  );
}

/**
 * A face framed and named, as the sky frames a body: the photo dims a
 * little around it, four corners close in on it, and its name is set
 * under them. It glides from one face to the next, and keeps its place
 * while it fades, so it never jumps.
 */
export function Frame({ face, name }: { face: Face | null; name: string }) {
  const [last, setLast] = useState<{ face: Face; name: string } | null>(
    face ? { face, name } : null,
  );
  if (face && (face !== last?.face || name !== last.name)) setLast({ face, name });
  const at = face ?? last?.face;
  if (!at) return null;
  return (
    <span
      className={j.frame}
      data-on={face ? "" : undefined}
      style={{ "--x": at.x, "--y": at.y, "--r": at.r } as CSSProperties}
      aria-hidden
    >
      <span className={j.shade} />
      <span className={j.corners}>
        <span className={j.frameName}>{face ? name : last?.name}</span>
      </span>
    </span>
  );
}
