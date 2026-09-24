"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

import { now, person, projects, skills, socials, turns } from "../content";
import s from "./constellations.module.css";

/**
 * One sky, one camera. Every figure is built from real facts: a project's
 * figure is its name plus the four beats of its story, the craft figure is
 * the skill groups. Scrolling moves the camera from figure to figure and pulls
 * each one's stars out of the scatter into shape. At the end the camera pulls
 * back to show all of them, and then they fall into one point.
 */

type Figure = {
  name: string;
  /** World-space centre. */
  at: [number, number];
  stars: { label: string; x: number; y: number; mag?: number }[];
  edges: [number, number][];
};

const FIGURES: Figure[] = [
  {
    name: "The Maker",
    at: [-820, -420],
    stars: [
      { label: person.name, x: 0, y: 0, mag: 1.6 },
      { label: "Product", x: -0.85, y: -0.45 },
      { label: "Design", x: 0.55, y: -0.8 },
      { label: "Code", x: 0.95, y: 0.35 },
      { label: "The call", x: -0.4, y: 0.85 },
    ],
    edges: [
      [1, 0],
      [0, 2],
      [2, 3],
      [0, 4],
    ],
  },
  {
    name: projects[0].name,
    at: [80, -560],
    stars: [
      { label: projects[0].name, x: -0.95, y: -0.3, mag: 1.5 },
      { label: "Before", x: -0.42, y: -0.52 },
      { label: "Took on", x: 0.08, y: -0.3 },
      { label: "Instead of", x: 0.46, y: 0.12 },
      { label: "Since", x: 0.95, y: 0.6 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: projects[1].name,
    at: [900, -120],
    stars: [
      { label: projects[1].name, x: 0, y: -0.55, mag: 1.5 },
      { label: "Before", x: -0.95, y: -0.65 },
      { label: "Took on", x: 0, y: 0.05 },
      { label: "Instead of", x: 0.95, y: -0.6 },
      { label: "Since", x: 0.05, y: 0.95 },
    ],
    edges: [
      [0, 2],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
  },
  {
    name: projects[2].name,
    at: [-300, 180],
    stars: [
      { label: projects[2].name, x: -1, y: 0.25, mag: 1.5 },
      { label: "Before", x: -0.5, y: 0.08 },
      { label: "Took on", x: 0, y: -0.04 },
      { label: "Instead of", x: 0.5, y: -0.2 },
      { label: "Since", x: 1, y: -0.32 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "Craft",
    at: [520, 520],
    stars: [
      { label: "Craft", x: 0, y: 0, mag: 1.5 },
      ...skills.map((g, i) => {
        const a = -2.2 + i * 1.45;
        return { label: g.group, x: Math.cos(a) * 0.9, y: Math.sin(a) * 0.8 };
      }),
    ],
    edges: skills.map((_, i) => [0, i + 1] as [number, number]),
  },
  {
    name: "Turns",
    at: [-880, 560],
    stars: turns.map((t, i) => ({
      label: t.year,
      x: -0.9 + i * 0.6,
      y: 0.6 - i * 0.4 + (i % 2 ? 0.15 : 0),
      mag: i === 2 ? 1.5 : 1,
    })),
    edges: turns.slice(1).map((_, i) => [i, i + 1] as [number, number]),
  },
  {
    name: "Heading",
    at: [1080, 620],
    stars: [
      { label: "Building", x: -0.7, y: 0.5 },
      { label: "Writing", x: 0.1, y: -0.75 },
      { label: "Looking", x: 0.8, y: 0.3, mag: 1.5 },
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
];

const FIG_SCALE = 230;
const WORLD = { w: 2700, h: 1800 };
const HERO_STEP = 0;
const OVERVIEW_STEP = FIGURES.length + 1;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic scatter, so server and client, and every reload, agree. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Constellations() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const serif =
      getComputedStyle(root).getPropertyValue("--cn-serif").trim() || "serif";
    const sans =
      getComputedStyle(root).getPropertyValue("--cn-sans").trim() || "sans-serif";

    const stars = FIGURES.flatMap((f, fi) =>
      f.stars.map((st, si) => ({
        fi,
        si,
        label: st.label,
        mag: st.mag ?? 1,
        fx: f.at[0] + st.x * FIG_SCALE,
        fy: f.at[1] + st.y * FIG_SCALE,
        sx: (rand(fi * 17 + si * 3 + 1) - 0.5) * WORLD.w,
        sy: (rand(fi * 31 + si * 7 + 2) - 0.5) * WORLD.h,
        tw: rand(fi * 13 + si) * 6,
      })),
    );
    const dust = Array.from({ length: 900 }, (_, i) => ({
      x: (rand(i + 1000) - 0.5) * WORLD.w * 1.6,
      y: (rand(i + 2000) - 0.5) * WORLD.h * 1.6,
      r: 0.3 + rand(i + 3000) * 0.9,
      a: 0.15 + rand(i + 4000) * 0.5,
    }));

    let w = 0;
    let h = 0;
    let raf = 0;
    let smooth = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** The camera for a whole-numbered step. */
    const keyframe = (step: number) => {
      const narrow = w < 760;
      const whole = Math.min(w / (WORLD.w * 1.02), h / (WORLD.h * 1.02));
      if (step <= HERO_STEP || step >= OVERVIEW_STEP)
        return { x: 0, y: 0, z: whole, ax: w / 2, ay: h / 2 };
      const f = FIGURES[step - 1];
      return {
        x: f.at[0],
        y: f.at[1],
        z: Math.min(w, h) / (narrow ? 640 : 760),
        ax: narrow ? w / 2 : w * 0.66,
        ay: narrow ? h * 0.34 : h / 2,
      };
    };

    const draw = (t: number) => {
      const target = window.scrollY / window.innerHeight;
      smooth += (target - smooth) * 0.12;
      const step = smooth;

      const k0 = keyframe(Math.floor(step));
      const k1 = keyframe(Math.ceil(step));
      const e = ease(step - Math.floor(step));
      /* Zoom in log space, so the move feels like one continuous dolly. */
      const cam = {
        x: lerp(k0.x, k1.x, e),
        y: lerp(k0.y, k1.y, e),
        z: Math.exp(lerp(Math.log(k0.z), Math.log(k1.z), e)),
        ax: lerp(k0.ax, k1.ax, e),
        ay: lerp(k0.ay, k1.ay, e),
      };
      const toScreen = (x: number, y: number) => [
        (x - cam.x) * cam.z + cam.ax,
        (y - cam.y) * cam.z + cam.ay,
      ];

      const collapse = ease(clamp01(step - OVERVIEW_STEP));

      ctx.clearRect(0, 0, w, h);

      /* Dust sits further back than the figures, so it moves less. */
      for (const d of dust) {
        const px = (d.x - cam.x * 0.35) * cam.z * 0.6 + w / 2;
        const py = (d.y - cam.y * 0.35) * cam.z * 0.6 + h / 2;
        if (px < -2 || py < -2 || px > w + 2 || py > h + 2) continue;
        ctx.globalAlpha = d.a * (1 - collapse);
        ctx.fillStyle = "#c9d6ff";
        ctx.fillRect(px, py, d.r, d.r);
      }

      const posOf = (st: (typeof stars)[number]) => {
        const formed = ease(clamp01(step - st.fi));
        let x = lerp(st.sx, st.fx, formed);
        let y = lerp(st.sy, st.fy, formed);
        x = lerp(x, 0, collapse);
        y = lerp(y, 0, collapse);
        return { formed, p: toScreen(x, y) };
      };

      /* Lines first, so the stars sit on top of them. */
      FIGURES.forEach((f, fi) => {
        const base = stars.filter((st) => st.fi === fi);
        const formed = ease(clamp01(step - fi));
        const reveal = clamp01((formed - 0.45) / 0.55);
        if (reveal <= 0) return;
        const active = 1 - clamp01(Math.abs(step - (fi + 1)) * 1.4);
        ctx.globalAlpha = (0.28 + 0.5 * active) * (1 - collapse);
        ctx.strokeStyle = "#8fb1ff";
        ctx.lineWidth = 1;
        f.edges.forEach(([a, b], ei) => {
          const local = clamp01(reveal * f.edges.length - ei);
          if (local <= 0) return;
          const pa = posOf(base[a]).p;
          const pb = posOf(base[b]).p;
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(lerp(pa[0], pb[0], local), lerp(pa[1], pb[1], local));
          ctx.stroke();
        });

        /* Names and star labels, only on the figure you're looking at. */
        if (active > 0.01) {
          const [nx, ny] = toScreen(f.at[0], f.at[1] - FIG_SCALE * 1.35);
          ctx.globalAlpha = active * reveal * (1 - collapse);
          ctx.fillStyle = "#e9eeff";
          ctx.textAlign = "center";
          ctx.font = `italic ${Math.round(Math.min(44, 30 * cam.z))}px ${serif}`;
          ctx.fillText(f.name, nx, ny);
          ctx.font = `13px ${sans}`;
          ctx.fillStyle = "#9aa6c8";
          ctx.textAlign = "left";
          for (const st of base) {
            const { p } = posOf(st);
            ctx.fillText(st.label, p[0] + 10, p[1] - 8);
          }
        }
      });

      for (const st of stars) {
        const { formed, p } = posOf(st);
        const twinkle = 0.7 + 0.3 * Math.sin(t / 900 + st.tw);
        const r = (1.6 + formed * 0.8) * st.mag;
        const fade = 1 - collapse * 0.85;
        /* A halo marks these as the stars that mean something, even before
           they've been joined up. */
        const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 6);
        halo.addColorStop(0, "rgba(143, 177, 255, 0.35)");
        halo.addColorStop(1, "rgba(143, 177, 255, 0)");
        ctx.globalAlpha = twinkle * fade;
        ctx.fillStyle = halo;
        ctx.fillRect(p[0] - r * 6, p[1] - r * 6, r * 12, r * 12);
        ctx.globalAlpha = (0.75 + 0.25 * formed) * twinkle * fade;
        ctx.fillStyle = "#f4f7ff";
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Everything above fell into this. */
      if (collapse > 0.6) {
        const [dx, dy] = toScreen(0, 0);
        const a = clamp01((collapse - 0.6) / 0.4);
        const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 26);
        g.addColorStop(0, `rgba(156, 200, 255, ${0.55 * a})`);
        g.addColorStop(1, "rgba(156, 200, 255, 0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(dx - 30, dy - 30, 60, 60);
        ctx.fillStyle = `rgba(190, 222, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    resize();
    smooth = window.scrollY / window.innerHeight;
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const chapters: { title: string; body: ReactNode }[] = [
    { title: "The Maker", body: <p>{person.intro}</p> },
    ...projects.map((p) => ({
      title: p.name,
      body: (
        <>
          <p className={s.move}>{p.move}</p>
          <dl className={s.beats}>
            <dt>Before</dt>
            <dd>{p.before}</dd>
            <dt>Took on</dt>
            <dd>{p.choice}</dd>
            <dt>Instead of</dt>
            <dd>{p.tradeoff}</dd>
            <dt>Since</dt>
            <dd>{p.shift}</dd>
          </dl>
        </>
      ),
    })),
    {
      title: "Craft",
      body: (
        <dl className={s.beats}>
          {skills.map((g) => (
            <div key={g.group} className={s.pair}>
              <dt>{g.group}</dt>
              <dd>{g.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: "Turns",
      body: (
        <dl className={s.beats}>
          {turns.map((t) => (
            <div key={t.year} className={s.pair}>
              <dt>{t.year}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: "Heading",
      body: (
        <ul className={s.list}>
          {now.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <main id="content" ref={rootRef} className={s.root}>
      <canvas ref={canvasRef} className={s.sky} aria-hidden />

      <section className={s.hero}>
        <p className={s.name}>{person.name}</p>
        <h1 className={s.heroLine}>Every point here is something I did.</h1>
        <p className={s.heroSub}>Scroll, and they join up.</p>
      </section>

      {chapters.map((c) => (
        <section key={c.title} className={s.chapter}>
          <div className={s.panel}>
            <h2 className={s.title}>{c.title}</h2>
            {c.body}
          </div>
        </section>
      ))}

      <section className={s.overview}>
        <p className={s.overLine}>
          Seen together, it&apos;s one shape. {person.thesis}
        </p>
      </section>

      <section className={s.end}>
        <div className={s.endText}>
          <p className={s.endLine}>And all of it happened on one point of light.</p>
          <nav className={s.links} aria-label="Contact">
            <Link href="/story">Read the note</Link>
            {socials.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
