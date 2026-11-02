"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from "react";

import type { AwardStory, Person, Snapshot } from "@/content/work";

import { LinkedInMark } from "./platforms";
import { Frame, useNear } from "./prints";
import j from "./journey.module.css";

type Stop = AwardStory["days"]["stops"][number];
type Face = NonNullable<Snapshot["faces"]>[number];
/** Where someone was met: a photograph of it, their face in it where it's
    placed, and the day, said briefly. */
type Met = { photo: Snapshot; face: Face | null; where: string };

const GROUPS = [
  ["team", "The team"],
  ["winners", "The other winners"],
  ["summit", "At the summit"],
] as const;

/* The preview's size: as tall as this, and as wide as its photo's shape. */
const PREVIEW_H = 240;
const GAP = 28;

/* Where each person was met: the first day after the flight lands whose
   photographs show their face, or failing that, the first day naming them;
   failing both, any day before it. */
function metOf(people: Person[], stops: Stop[]) {
  const landed = stops.findLastIndex((st) => st.along !== undefined) + 1;
  const order = [...stops.slice(landed), ...stops.slice(0, landed)];
  const out: Record<string, Met> = {};
  for (const p of people) {
    const where = (st: Stop) => `${st.title} · ${st.when}`;
    for (const st of order) {
      const photo = st.photos?.find((ph) => ph.faces?.some((f) => f.who === p.id));
      const face = photo?.faces?.find((f) => f.who === p.id);
      if (photo && face) {
        out[p.id] = { photo, face, where: where(st) };
        break;
      }
    }
    if (out[p.id]) continue;
    const st = order.find((s) => s.with?.includes(p.id) && s.photos?.length);
    if (st?.photos) out[p.id] = { photo: st.photos[0], face: null, where: where(st) };
  }
  return out;
}

const small = (src: string) => src.replace(/\.webp$/, "-sm.webp");

/**
 * The people met along the way, in three lists (the team, the other track
 * winners, and the people at the summit), each name linked to their
 * LinkedIn. The rows rise in, one after another, as the lists come on
 * screen.
 *
 * Pointed at, a row lights: a line draws in under it in the award's
 * colour, the name steps forward, and the LinkedIn mark takes its own blue.
 * Beside the pointer, the photograph from where we met floats up and
 * follows it, leaning with its motion, with the person framed and named in
 * it as the sky frames a body. Reached by keyboard, it shows beside the
 * row. Where there's no hover (a phone), the rows are simply links.
 */
export function People({ people, stops }: { people: Person[]; stops: Stop[] }) {
  const met = useMemo(() => metOf(people, stops), [people, stops]);
  const names = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p.name])),
    [people],
  );
  /* Each photograph once, to fade between. */
  const photos = useMemo(
    () => [...new Set(Object.values(met).map((m) => m.photo))],
    [met],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const near = useNear(rootRef);
  const [seen, setSeen] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  /* Who the preview shows, kept while it fades. */
  const [last, setLast] = useState<string | null>(null);
  if (hot && hot !== last) setLast(hot);
  const shown = last ? met[last] : null;

  const card = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0, tilt: 0 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* The preview follows its target, a little behind, leaning with how fast
     it's moving. */
  useEffect(() => {
    const el = card.current;
    if (!hot || !el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let id = 0;
    const step = () => {
      const p = pos.current;
      const t = target.current;
      const k = calm ? 1 : 0.16;
      const dx = (t.x - p.x) * k;
      p.x += dx;
      p.y += (t.y - p.y) * k;
      p.tilt += (Math.max(-7, Math.min(7, dx * 0.5)) - p.tilt) * 0.18;
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${calm ? 0 : p.tilt}deg)`;
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [hot]);

  /* Where the preview should be: beside the pointer, on whichever side
     has room, and never off the screen. */
  const aim = (x: number, y: number, id: string, snap: boolean) => {
    const m = met[id];
    if (!m) return;
    const width = PREVIEW_H * (m.photo.width / m.photo.height);
    const left = x + GAP + width > window.innerWidth - 16 ? x - GAP - width : x + GAP;
    const top = Math.max(
      16,
      Math.min(window.innerHeight - PREVIEW_H - 56, y - PREVIEW_H / 2),
    );
    target.current = { x: left, y: top };
    if (snap) pos.current = { x: left, y: top + 14, tilt: 0 };
  };

  const enter = (id: string) => (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    aim(e.clientX, e.clientY, id, !hot);
    setHot(id);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (hot && e.pointerType === "mouse") aim(e.clientX, e.clientY, hot, false);
  };
  const focus = (id: string) => (e: FocusEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    aim(box.left + box.width * 0.62, box.top + box.height / 2, id, true);
    setHot(id);
  };
  const leave = () => setHot(null);

  return (
    <div
      ref={rootRef}
      className={j.people}
      data-in={seen || undefined}
      onPointerMove={move}
    >
      {GROUPS.map(([group, label]) => {
        const list = people.filter((p) => p.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className={j.group} aria-label={label}>
            <h3 className={j.groupLabel}>
              {label}
              <span className={j.groupCount}>{list.length}</span>
            </h3>
            <ul className={j.rows}>
              {list.map((p, i) => {
                const where = group === "team" ? undefined : met[p.id]?.where;
                const body = (
                  <>
                    <span className={j.rowName}>{p.name}</span>
                    <span className={j.rowAbout}>
                      {p.role && <span className={j.rowRole}>{p.role}</span>}
                      {where && <span className={j.rowWhere}>{where}</span>}
                    </span>
                    {p.linkedin && (
                      <span className={j.rowLink}>
                        <LinkedInMark className={j.rowMark} />
                        <span className={j.rowLinkText}>LinkedIn</span>
                        <span className={j.rowArrow} aria-hidden>
                          ↗
                        </span>
                      </span>
                    )}
                  </>
                );
                const style = { "--i": i } as CSSProperties;
                return (
                  <li key={p.id} className={j.rowItem} style={style}>
                    {p.linkedin ? (
                      <a
                        className={j.personRow}
                        href={p.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        data-hot={hot === p.id || undefined}
                        onPointerEnter={enter(p.id)}
                        onPointerLeave={leave}
                        onFocus={focus(p.id)}
                        onBlur={leave}
                        aria-label={`${p.name}${p.role ? `, ${p.role}` : ""}, on LinkedIn`}
                      >
                        {body}
                      </a>
                    ) : (
                      <div
                        className={j.personRow}
                        data-plain
                        data-hot={hot === p.id || undefined}
                        onPointerEnter={enter(p.id)}
                        onPointerLeave={leave}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div
        ref={card}
        className={j.preview}
        data-on={hot && met[hot] ? "" : undefined}
        style={
          shown
            ? ({ "--ar": shown.photo.width / shown.photo.height } as CSSProperties)
            : undefined
        }
        aria-hidden
      >
        <div className={j.previewPhoto}>
          {photos.map((ph) => (
            // eslint-disable-next-line @next/next/no-img-element -- served as is, as every picture on the site is (picture.tsx)
            <img
              key={ph.src}
              src={near ? small(ph.src) : undefined}
              width={ph.width / 2}
              height={ph.height / 2}
              alt=""
              decoding="async"
              className={j.previewImg}
              data-on={shown?.photo === ph || undefined}
            />
          ))}
          {shown && (
            <Frame
              key={shown.photo.src}
              face={shown.face}
              name={last ? (names[last] ?? "") : ""}
            />
          )}
        </div>
        <p className={j.previewWhere}>{shown?.where}</p>
      </div>
    </div>
  );
}
