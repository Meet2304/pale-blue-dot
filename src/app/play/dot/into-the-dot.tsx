"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

import { now, person, projects, skills, socials, turns } from "../content";
import s from "./into-the-dot.module.css";

/**
 * Powers of Ten, run backwards into the photograph. Every step is the same
 * magnification, and every layer is drawn around the point the next one grows
 * out of: the dot becomes a planet, the planet's night side becomes city
 * lights, one city becomes streets, one window, one desk, one screen — and on
 * the screen is the photograph again.
 */

/** Magnification from one layer to the next. */
const ZOOM = 12;

/** Where the dot is in /pale-blue-dot.jpg (1024 × 768), as fractions. */
const DOT = { x: 609 / 1024, y: 404 / 768 };

/** Field of view at each layer, in metres. */
const FIELDS = [1e11, 3e7, 3e6, 2e4, 30, 2, 0.35];

function formatField(m: number) {
  if (m >= 1e9) return `${Math.round(m / 1e9).toLocaleString("en-US")} million km`;
  if (m >= 1e3) return `${Math.round(m / 1e3).toLocaleString("en-US")} km`;
  if (m >= 1) return `${m.toFixed(m < 10 ? 1 : 0)} m`;
  return `${Math.round(m * 100)} cm`;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Deterministic, and rounded, so server and client render identical markup. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1e4) / 1e4;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function IntoTheDot() {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = window.scrollY / window.innerHeight;
    const last = FIELDS.length - 1;

    const frame = () => {
      const target = Math.min(last, window.scrollY / window.innerHeight);
      smooth += (target - smooth) * 0.14;
      const st = smooth;

      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = st - i;
        /* Visible from when it is a speck in the last layer until it has
           grown well past the edges of the screen. */
        if (d < -1.05 || d > 1.2) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.transform = `scale(${Math.pow(ZOOM, d)})`;
        const fadeIn = clamp01((d + 1) / 0.55);
        const fadeOut = i === last ? 1 : clamp01((1 - d) / 0.55);
        el.style.opacity = String(Math.min(fadeIn, fadeOut));
      });

      noteRefs.current.forEach((el, i) => {
        if (!el) return;
        const o = clamp01(1 - Math.abs(st - i) * 2.6);
        el.style.opacity = String(o);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
        el.style.transform = `translateY(${(st - i) * -24}px)`;
      });

      const lo = Math.floor(st);
      const hi = Math.min(last, lo + 1);
      const f = st - lo;
      const field = Math.exp(Math.log(FIELDS[lo]) * (1 - f) + Math.log(FIELDS[hi]) * f);
      if (fieldRef.current) fieldRef.current.textContent = formatField(field);
      if (barRef.current)
        barRef.current.style.transform = `scaleX(${0.3 + 0.7 * (1 - f + f / ZOOM) ** 0.5})`;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const layers: ReactNode[] = [
    <PhotoLayer key="photo" />,
    <EarthLayer key="earth" />,
    <LightsLayer key="lights" />,
    <CityLayer key="city" />,
    <WindowLayer key="window" />,
    <DeskLayer key="desk" />,
    <ScreenLayer key="screen" />,
  ];

  const notes: ReactNode[] = [
    <>
      <p className={s.kicker}>{person.name}</p>
      <h1 className={s.big}>{person.heroLine}</h1>
      <p>
        This is Earth, from six billion kilometres. It&apos;s smaller than one pixel.
        Everything I&apos;ve done happened inside it. Scroll to go in.
      </p>
    </>,
    <>
      <h2 className={s.mid}>Why any of this</h2>
      <p>{person.whyShort}</p>
    </>,
    <>
      <h2 className={s.mid}>The turns that led here</h2>
      <p>
        Each light is a decision that changed direction, not just a thing that happened.
      </p>
    </>,
    <>
      <h2 className={s.mid}>What I built here</h2>
      {projects.map((p) => (
        <p key={p.name}>
          <strong>{p.name}.</strong> {p.move} {p.shift}
        </p>
      ))}
    </>,
    <>
      <h2 className={s.mid}>One window is still on</h2>
      <ul>
        {now.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </>,
    <>
      <h2 className={s.mid}>What&apos;s on the desk</h2>
      <p>The tools I reach for most, stuck where I can see them.</p>
    </>,
    <>
      <h2 className={s.big}>Hello. You found me.</h2>
      <p>{person.intro}</p>
      <nav className={s.links} aria-label="Contact">
        <Link href="/story">Read the note</Link>
        {socials.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Go round again
        </button>
      </nav>
    </>,
  ];

  return (
    <main
      id="content"
      className={s.root}
      style={{ height: `${FIELDS.length * 100}svh` }}
    >
      <div className={s.stage}>
        {layers.map((layer, i) => (
          <div
            key={i}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            className={s.layer}
            aria-hidden
          >
            {layer}
          </div>
        ))}

        <div className={s.scale} aria-hidden>
          <span className={s.scaleLabel}>Field of view</span>
          <span ref={fieldRef} className={s.scaleValue}>
            {formatField(FIELDS[0])}
          </span>
          <span className={s.scaleBar}>
            <span ref={barRef} />
          </span>
        </div>

        {notes.map((n, i) => (
          <div
            key={i}
            ref={(el) => {
              noteRefs.current[i] = el;
            }}
            className={s.note}
            data-last={i === notes.length - 1 ? "true" : undefined}
          >
            {n}
          </div>
        ))}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * The layers. Each is drawn full-screen around its centre, which is always the
 * point the next layer grows out of.
 * ------------------------------------------------------------------------- */

function PhotoLayer() {
  return (
    <div className={s.photo}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pale-blue-dot.jpg"
        alt=""
        style={{
          left: `calc(50% - ${DOT.x} * var(--pw))`,
          top: `calc(50% - ${DOT.y} * var(--ph))`,
        }}
      />
    </div>
  );
}

function EarthLayer() {
  const lights = Array.from({ length: 70 }, (_, i) => {
    const a = rand(i) * Math.PI * 2;
    const r = Math.pow(rand(i + 99), 1.6) * 16;
    return {
      x: r3(50 + Math.cos(a) * r),
      y: r3(50 + Math.sin(a) * r * 0.8),
      o: r3(0.3 + rand(i + 7) * 0.7),
    };
  });
  return (
    <div className={s.earthWrap}>
      <div className={s.earth} />
      <svg viewBox="0 0 100 100" className={s.fill} preserveAspectRatio="xMidYMid meet">
        {lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={0.18} fill="#ffc978" opacity={l.o} />
        ))}
        <circle cx={50} cy={50} r={0.45} fill="#ffe2b0" />
      </svg>
    </div>
  );
}

function LightsLayer() {
  /* Clusters of light, and the turns placed as cities joined by the route
     between them. The last one is where everything is heading: the centre. */
  const cities = [
    { x: 82, y: 72 },
    { x: 24, y: 22 },
    { x: 72, y: 18 },
    { x: 50, y: 50 },
  ];
  const dots = Array.from({ length: 520 }, (_, i) => {
    const c = cities[i % cities.length];
    /* Dense cores thinning into suburbs: radius skews towards the centre. */
    const spread = i % 5 === 0 ? 18 : 5;
    const a = rand(i) * Math.PI * 2;
    const d = Math.pow(rand(i + 500), 2) * spread;
    return {
      x: r3(c.x + Math.cos(a) * d),
      y: r3(c.y + Math.sin(a) * d * 0.8),
      r: r3(0.12 + rand(i + 900) * 0.22),
      o: r3(0.25 + rand(i + 1300) * 0.6),
    };
  });
  return (
    <div className={s.night}>
      <svg
        viewBox="0 0 100 100"
        className={s.fill}
        preserveAspectRatio="xMidYMid slice"
      >
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ffc978" opacity={d.o} />
        ))}
        {cities.slice(1).map((c, i) => {
          const p = cities[i];
          const mx = (p.x + c.x) / 2;
          const my = Math.min(p.y, c.y) - 12;
          return (
            <path
              key={i}
              d={`M ${p.x} ${p.y} Q ${mx} ${my} ${c.x} ${c.y}`}
              className={s.route}
            />
          );
        })}
      </svg>
      {cities.map((c, i) => (
        <span
          key={i}
          className={s.cityLabel}
          data-edge={c.x > 60 ? "right" : undefined}
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
        >
          <b>{turns[i].year}</b> {turns[i].text}
        </span>
      ))}
    </div>
  );
}

function CityLayer() {
  const lines = Array.from({ length: 26 }, (_, i) => r3(i * 4 + (rand(i) - 0.5) * 1.5));
  const districts = [
    { x: 14, y: 16, w: 22, h: 16 },
    { x: 64, y: 20, w: 24, h: 18 },
    { x: 20, y: 66, w: 26, h: 16 },
  ];
  return (
    <div className={s.city}>
      <svg
        viewBox="0 0 100 100"
        className={s.fill}
        preserveAspectRatio="xMidYMid slice"
      >
        {lines.map((v, i) => (
          <g key={i} className={i % 6 === 0 ? s.avenue : s.street}>
            <line x1={v} y1={0} x2={v} y2={100} />
            <line x1={0} y1={v} x2={100} y2={v} />
          </g>
        ))}
        {districts.map((d, i) => (
          <rect
            key={i}
            x={d.x}
            y={d.y}
            width={d.w}
            height={d.h}
            className={s.district}
          />
        ))}
        <rect x={48.5} y={48.5} width={3} height={3} fill="#ffe2b0" />
      </svg>
      {districts.map((d, i) => (
        <span
          key={i}
          className={s.districtLabel}
          style={{ left: `${d.x}%`, top: `${d.y + d.h + 1}%` }}
        >
          {projects[i].name}
        </span>
      ))}
    </div>
  );
}

function WindowLayer() {
  const cols = 9;
  const rows = 7;
  return (
    <div className={s.facade}>
      <div
        className={s.windows}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols * rows }, (_, i) => {
          const centre = i === Math.floor((cols * rows) / 2);
          const lit = !centre && rand(i + 40) > 0.86;
          return <span key={i} data-state={centre ? "on" : lit ? "dim" : "off"} />;
        })}
      </div>
    </div>
  );
}

function DeskLayer() {
  const spots = [
    { x: 8, y: 12, r: -4 },
    { x: 76, y: 10, r: 3 },
    { x: 6, y: 64, r: 2 },
    { x: 78, y: 66, r: -3 },
  ];
  return (
    <div className={s.desk}>
      {/* The laptop's screen is the next layer itself, at exactly one step's
          magnification, so the zoom lands on it without a seam. */}
      <div className={s.laptop} />
      <div className={s.miniScreen}>
        <ScreenLayer />
      </div>
      {skills.map((g, i) => (
        <div
          key={g.group}
          className={s.sticky}
          style={{
            left: `${spots[i].x}%`,
            top: `${spots[i].y}%`,
            rotate: `${spots[i].r}deg`,
          }}
        >
          <b>{g.group}</b>
          {g.items.map((it) => (
            <span key={it}>{it}</span>
          ))}
        </div>
      ))}
      <div className={s.mug} />
    </div>
  );
}

function ScreenLayer() {
  return (
    <div className={s.screen}>
      <div className={s.screenPhoto}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pale-blue-dot.jpg"
          alt=""
          style={{
            left: `calc(50% - ${DOT.x} * var(--pw))`,
            top: `calc(50% - ${DOT.y} * var(--ph))`,
          }}
        />
      </div>
    </div>
  );
}
