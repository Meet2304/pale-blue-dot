"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";

import { COLLECTIONS, KINDS, KIND_ORDER, colorsOf, type Kind, type Unit } from "./data";
import { UniverseCanvas } from "./universe-canvas";
import s from "./universe.module.css";

const CHAPTERS = ["earth", "map", ...COLLECTIONS.map((c) => c.id), "home"];
const TICKS = [
  "earth",
  "map",
  ...COLLECTIONS.map((c) => (c.id === "2022" ? "2022" : c.id)),
  "map",
];

const kindVars = (k: Kind) => {
  const c = colorsOf(KINDS[k].hue, KINDS[k].l, KINDS[k].c);
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

export function Universe() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [active, setActive] = useState(0);
  const hoverRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const goTo = useCallback((chapter: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + chapter * window.innerHeight, behavior: "smooth" });
  }, []);

  /* Which chapter is on screen, for the index on the right. */
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const s = -el.getBoundingClientRect().top / window.innerHeight;
      setActive(Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(s))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hover = (id: string | null) => () => {
    hoverRef.current = id;
  };

  return (
    <main id="content" className={s.root}>
      <section
        ref={sectionRef}
        data-universe
        className={s.universe}
        style={{ height: `${CHAPTERS.length * 100}svh` }}
      >
        <div className={s.stage}>
          <UniverseCanvas
            filter={filter}
            hoverRef={hoverRef}
            onPick={(ci) => goTo(ci + 2)}
            className={s.canvas}
          />
          <nav className={s.filter} aria-label="Show one kind of work">
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              all
            </button>
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                style={kindVars(k)}
                aria-pressed={filter === k}
                onClick={() => setFilter(filter === k ? "all" : k)}
              >
                <span className={s.mark} aria-hidden>
                  {KINDS[k].mark}
                </span>
                {KINDS[k].label.toLowerCase()}
              </button>
            ))}
          </nav>
          <ol className={s.ticks} aria-label="Chapters">
            {TICKS.map((label, i) => (
              <li key={`${label}-${i}`}>
                <button
                  type="button"
                  aria-current={active === i ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className={s.chapters}>
          <Chapter>
            <p className={s.kicker}>Meet Bhatt</p>
            <h1 className={s.hero}>What&apos;s missing, I make.</h1>
            <p className={s.lede}>
              AI engineer and product builder. MS in AI Engineering at Carnegie Mellon.
            </p>
            <p className={s.hint}>scroll to pull back</p>
          </Chapter>

          <Chapter>
            <p className={s.kicker}>The map</p>
            <h2 className={s.title}>Everything, around one point of light.</h2>
            <p className={s.lede}>
              Every point of light out here is one part of my life. The small blue one
              is where all of it happened.
            </p>
            <table className={s.key}>
              <tbody>
                {KIND_ORDER.map((k) => (
                  <tr key={k} style={kindVars(k)}>
                    <td className={s.mark}>{KINDS[k].mark}</td>
                    <td>{KINDS[k].bodyName}</td>
                    <td className={s.muted}>{KINDS[k].label.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className={s.rules}>
              <div>
                <dt>brightness</dt>
                <dd>impact</dd>
              </div>
              <div>
                <dt>distance</dt>
                <dd>time, newest closest</dd>
              </div>
              <div>
                <dt>closer</dt>
                <dd>scroll, and each one resolves</dd>
              </div>
            </dl>
          </Chapter>

          {COLLECTIONS.map((col, ci) => (
            <Chapter key={col.id}>
              <p className={s.kicker}>
                {ci + 1} of {COLLECTIONS.length}, {col.span}
              </p>
              <h2 className={s.title}>{col.title}</h2>
              <p className={s.lede}>{col.note}</p>
              <ul className={s.units}>
                {col.units.map((u) => (
                  <UnitRow
                    key={u.id}
                    u={u}
                    onEnter={hover(u.id)}
                    onLeave={hover(null)}
                  />
                ))}
              </ul>
            </Chapter>
          ))}

          <Chapter>
            <p className={s.kicker}>Home</p>
            <h2 className={s.title}>All of it happened here.</h2>
            <p className={s.lede}>
              On the pale blue dot, one piece at a time. It is a little brighter than it
              was.
            </p>
            <nav className={s.links} aria-label="Elsewhere">
              <Link href="/story">Read the note</Link>
              <a href="mailto:mbbhatt@andrew.cmu.edu">Email</a>
              <a href="https://github.com/Meet2304" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/meet-bhatt2304"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </nav>
          </Chapter>
        </div>
      </section>

      <section className={s.index} aria-labelledby="index-title">
        <h2 id="index-title" className={s.indexTitle}>
          Index
        </h2>
        <p className={s.lede}>The same map, as a list.</p>
        <table className={s.table}>
          <thead>
            <tr>
              <th>when</th>
              <th>name</th>
              <th>kind</th>
              <th>result</th>
            </tr>
          </thead>
          <tbody>
            {COLLECTIONS.flatMap((c) => c.units).map((u) => (
              <tr key={u.id} style={kindVars(u.kind)}>
                <td className={s.muted}>{u.when}</td>
                <td>
                  {u.link ? (
                    <a href={u.link.href} target="_blank" rel="noreferrer">
                      {u.name}
                    </a>
                  ) : (
                    u.name
                  )}
                </td>
                <td>
                  <span className={s.mark}>{KINDS[u.kind].mark}</span>{" "}
                  {KINDS[u.kind].label.toLowerCase()}
                </td>
                <td className={s.muted}>{u.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={s.foot}>
          <Link href="/play/systems">All design systems</Link>
        </p>
      </section>
    </main>
  );
}

function Chapter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => setOn(e.intersectionRatio > 0.55), {
      threshold: [0, 0.55, 1],
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.chapter} data-on={on}>
      <div className={s.column}>{children}</div>
    </div>
  );
}

function UnitRow({
  u,
  onEnter,
  onLeave,
}: {
  u: Unit;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const kind = KINDS[u.kind];
  return (
    <li
      className={s.unit}
      style={kindVars(u.kind)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <div className={s.unitHead}>
        <span className={s.mark} aria-hidden>
          {kind.mark}
        </span>
        <span className={s.unitName}>{u.name}</span>
        <span className={s.unitKind}>{kind.bodyName}</span>
      </div>
      <p className={s.unitLine}>{u.line}</p>
      <p className={s.unitResult}>{u.result}</p>
      {u.link && (
        <a className={s.unitLink} href={u.link.href} target="_blank" rel="noreferrer">
          {u.link.label}
        </a>
      )}
    </li>
  );
}
