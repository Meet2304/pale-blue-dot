"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { AwardStory, Person } from "@/content/work";

import { LinkedInMark } from "./platforms";
import j from "./journey.module.css";

type Stop = AwardStory["days"]["stops"][number];

const GROUPS = [
  ["team", "The team"],
  ["winners", "The other winners"],
  ["summit", "At the summit"],
] as const;

/* Where each person was met, said briefly: the first day after the flight
   lands that names them or shows their face; failing that, any day that
   does. */
function whereOf(people: Person[], stops: Stop[]) {
  const landed = stops.findLastIndex((st) => st.along !== undefined) + 1;
  const order = [...stops.slice(landed), ...stops.slice(0, landed)];
  const out: Record<string, string> = {};
  for (const p of people) {
    const st = order.find(
      (s) =>
        s.with?.includes(p.id) ||
        s.photos?.some((ph) => ph.faces?.some((f) => f.who === p.id)),
    );
    if (st) out[p.id] = `${st.title} · ${st.when}`;
  }
  return out;
}

/**
 * The people met along the way, face first: in three groups (the team, the
 * other track winners, and the people at the summit), each a card with
 * their portrait, cut from the photographs, their name, what they do, where
 * we met, and their LinkedIn. The cards develop in, one after another, as
 * the groups come on screen, out of a white blur into colour, as the
 * journey's prints do.
 *
 * Pointed at, a card lifts and lights in the award's colour, the face eases
 * in a little, the site's corner ticks close in round it, and the LinkedIn
 * mark takes its own blue. The whole card is the link.
 */
export function People({ people, stops }: { people: Person[]; stops: Stop[] }) {
  const where = useMemo(() => whereOf(people, stops), [people, stops]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

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
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={j.people} data-in={seen || undefined}>
      {GROUPS.map(([group, label]) => {
        const list = people.filter((p) => p.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className={j.group} aria-label={label}>
            <h3 className={j.groupLabel}>
              {label}
              <span className={j.groupCount}>{list.length}</span>
            </h3>
            <ul className={j.cards}>
              {list.map((p, i) => (
                <Card
                  key={p.id}
                  p={p}
                  i={i}
                  where={group === "team" ? undefined : where[p.id]}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Card({ p, i, where }: { p: Person; i: number; where?: string }) {
  const small = p.portrait?.replace(/\.webp$/, "-sm.webp");
  const body = (
    <>
      <span className={j.face}>
        {p.portrait && (
          // eslint-disable-next-line @next/next/no-img-element -- served as is, as every picture on the site is (picture.tsx)
          <img
            src={p.portrait}
            srcSet={`${small} 240w, ${p.portrait} 480w`}
            sizes="(max-width: 640px) 45vw, 18rem"
            width={480}
            height={600}
            alt=""
            loading="lazy"
            decoding="async"
            className={j.faceImg}
          />
        )}
        <span className={j.faceTicks} aria-hidden />
      </span>
      <span className={j.cardName}>{p.name}</span>
      {p.role && <span className={j.cardRole}>{p.role}</span>}
      {where && <span className={j.cardWhere}>{where}</span>}
      {p.linkedin && (
        <span className={j.cardLink}>
          <LinkedInMark className={j.cardMark} />
          LinkedIn
          <span className={j.cardArrow} aria-hidden>
            ↗
          </span>
        </span>
      )}
    </>
  );
  return (
    <li className={j.cardItem} style={{ "--i": i } as CSSProperties}>
      {p.linkedin ? (
        <a
          className={j.card}
          href={p.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${p.name}${p.role ? `, ${p.role}` : ""}, on LinkedIn`}
        >
          {body}
        </a>
      ) : (
        <div className={j.card} data-plain>
          {body}
        </div>
      )}
    </li>
  );
}
