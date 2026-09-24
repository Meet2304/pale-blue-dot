"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { now, person, projects, skills, socials } from "../content";
import { Sky } from "../sky";
import s from "./voyager.module.css";

/** Where Voyager 1 was on 14 February 1990, when it took the photograph. */
const FINAL_KM = 6_060_000_000;
const C_KM_S = 299_792.458;

/** Planets for the flybys, in the order the real probe met them. */
const BODIES = ["jupiter", "saturn", "uranus"] as const;

const LEGS = [
  { id: "launch", label: "Leaving Earth" },
  { id: "why", label: "Clearing the Moon" },
  ...projects.map((p, i) => ({ id: `fly-${i}`, label: `Flyby: ${p.name}` })),
  { id: "instruments", label: "Instruments check" },
  { id: "heading", label: "Setting a heading" },
  { id: "turn", label: "Turning the camera round" },
];

function formatLight(km: number) {
  const secs = km / C_KM_S;
  if (secs < 60) return `${secs.toFixed(1)} s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min ${Math.floor(secs % 60)} s`;
}

export function Voyager() {
  const kmRef = useRef<HTMLSpanElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [leg, setLeg] = useState(LEGS[0].label);
  const [turned, setTurned] = useState(false);

  /* Distance rides scroll on a steep curve: the first screens are the Moon and
     the planets, and the last one covers the billions. Written straight to the
     DOM so scrolling never re-renders the page. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      const km = p >= 0.995 ? FINAL_KM : FINAL_KM * Math.pow(p, 3.2) + p * 384_400;
      if (kmRef.current)
        kmRef.current.textContent = Math.round(km).toLocaleString("en-US");
      if (lightRef.current) lightRef.current.textContent = formatLight(km);
      if (pathRef.current) {
        pathRef.current.style.strokeDashoffset = `${1 - Math.min(1, p * 6)}`;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const found = LEGS.find(
            (l) => l.id === (e.target as HTMLElement).dataset.leg,
          );
          if (found) setLeg(found.label);
          if (found?.id === "turn") setTurned(true);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    document.querySelectorAll("[data-leg]").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <main id="content" className={s.root}>
      <Sky parallax={0.12} density={7000} />

      <aside className={s.telemetry} aria-label="Flight telemetry">
        <div>
          <span className={s.tLabel}>Distance from Earth</span>
          <span className={s.tValue}>
            <span ref={kmRef}>0</span> km
          </span>
        </div>
        <div>
          <span className={s.tLabel}>A message home takes</span>
          <span className={s.tValue} ref={lightRef}>
            0.0 s
          </span>
        </div>
        <div>
          <span className={s.tLabel}>Now</span>
          <span className={s.tLeg} aria-live="polite">
            {leg}
          </span>
        </div>
      </aside>

      {/* Launch */}
      <section data-leg="launch" className={s.hero}>
        <svg
          className={s.trajectory}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            ref={pathRef}
            pathLength={1}
            d="M 90 900 C 380 860, 640 640, 1040 -40"
          />
        </svg>
        <span className={s.homeDot} aria-hidden />
        <p className={s.callsign}>{person.name}</p>
        <h1 className={s.heroLine}>{person.heroLine}</h1>
        <p className={s.heroIntro}>{person.intro}</p>
        <p className={s.cue}>Scroll to leave</p>
      </section>

      <section data-leg="why" className={s.why}>
        <p>{person.whyShort}</p>
        <p className={s.whySub}>
          So I left, to see it properly. This is the flight log.
        </p>
      </section>

      {projects.map((p, i) => (
        <section
          key={p.name}
          data-leg={`fly-${i}`}
          className={s.flyby}
          data-side={i % 2 ? "left" : "right"}
        >
          <div className={`${s.planet} ${s[BODIES[i % BODIES.length]]}`} aria-hidden />
          <div className={s.flyText}>
            <p className={s.flyKicker}>Encounter {i + 1}</p>
            <h2 className={s.flyName}>{p.name}</h2>
            <p className={s.flyMove}>{p.move}</p>
            <dl className={s.log}>
              <dt>Before I arrived</dt>
              <dd>{p.before}</dd>
              <dt>What I took on</dt>
              <dd>{p.choice}</dd>
              <dt>The easier course</dt>
              <dd>{p.tradeoff}</dd>
              <dt>What it changed</dt>
              <dd>{p.shift}</dd>
            </dl>
          </div>
        </section>
      ))}

      <section data-leg="instruments" className={s.instruments}>
        <h2 className={s.sectionTitle}>What I carry</h2>
        <p className={s.sectionLede}>
          Every probe is built around its instruments. These are mine, mounted on one
          boom because I use them together.
        </p>
        <div className={s.boom}>
          {skills.map((g) => (
            <div key={g.group} className={s.instrument}>
              <h3>{g.group}</h3>
              <ul>
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section data-leg="heading" className={s.heading}>
        <h2 className={s.sectionTitle}>Current heading</h2>
        <ul className={s.nowList}>
          {now.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section data-leg="turn" className={s.turn}>
        <div className={s.turnFrame} data-turned={turned}>
          <div className={s.beams} aria-hidden />
          <span className={s.farDot} aria-hidden />
          <span className={s.ring} aria-hidden />
          <div className={s.turnText}>
            <p className={s.turnLead}>Turn round and look.</p>
            <p>
              That&apos;s where everything happened. Everyone, every choice, all of it.
              I&apos;m trying to add something to it.
            </p>
            <nav className={s.links} aria-label="Contact">
              <Link href="/story">Read the note</Link>
              {socials.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}
