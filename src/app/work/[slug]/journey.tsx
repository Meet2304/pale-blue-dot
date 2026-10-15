"use client";

import { useEffect, useRef, useState } from "react";

import type { AwardStory, LonLat } from "@/content/work";
import { hash } from "@/components/universe/bodies";
import { EARTH_COLORS } from "@/components/universe/encoding";
import { fillGlyphs, glyphs } from "@/components/universe/glyph-gl";
import { CELL, fit } from "@/components/universe/helpers";

import s from "./award.module.css";

/**
 * The days of an award, read down one side, and the Earth on the other,
 * turning to wherever the day being read happened. It is the site's Earth,
 * set in the same characters (bodies.ts), but with the real coastlines
 * (`/earth-land.png`, Natural Earth's land at 1:110m, white on black), because here
 * the places matter. The flight is drawn on it as a ground track: planned,
 * in faint dots, until the day it leaves; flown, in the award's colour,
 * from then on.
 *
 * Nothing moves on its own. The globe turns when the reader moves to
 * another day (or picks one), and under a drag; between those it is still,
 * and drawn only when something changes.
 */

type Days = AwardStory["days"];
type Props = {
  stops: Days["stops"];
  flight: NonNullable<Days["flight"]>;
  /** The award's colours, as the map draws its body (looks.ts). */
  colors: string[];
};

/* Light from the upper left, as for every lit body on the site. */
const SUN = [-0.62, 0.42, 0.66];
const OCEAN = ["·", "-", "~", "≈"];
const LAND = [".", ",", ":", ";", "+"];
const LEVELS = 4;
const BUCKETS = 7 * LEVELS;
const D = Math.PI / 180;
const TURN = 1100;

type View = { lon: number; lat: number; flown: number };

/* A point on the unit sphere, and back. */
const vec = ([lon, lat]: LonLat) => [
  Math.cos(lat * D) * Math.cos(lon * D),
  Math.cos(lat * D) * Math.sin(lon * D),
  Math.sin(lat * D),
];
const lonlat = ([x, y, z]: number[]): LonLat => [
  Math.atan2(y, x) / D,
  Math.asin(Math.max(-1, Math.min(1, z))) / D,
];

/* The flight as a run of points along great circles, spaced evenly by
   distance, so "how much is flown" reads as distance flown. */
function track(stops: LonLat[], n = 240): LonLat[] {
  const legs = stops.slice(1).map((b, i) => {
    const a = vec(stops[i]);
    const c = vec(b);
    const w = Math.acos(
      Math.max(-1, Math.min(1, a[0] * c[0] + a[1] * c[1] + a[2] * c[2])),
    );
    return { a, c, w };
  });
  const total = legs.reduce((t, l) => t + l.w, 0);
  const out: LonLat[] = [];
  for (let k = 0; k <= n; k++) {
    let d = (k / n) * total;
    let leg = legs[0];
    for (const l of legs) {
      leg = l;
      if (d <= l.w) break;
      d -= l.w;
    }
    const f = leg.w ? Math.min(1, d / leg.w) : 0;
    const sa = Math.sin((1 - f) * leg.w) / Math.sin(leg.w || 1);
    const sb = Math.sin(f * leg.w) / Math.sin(leg.w || 1);
    out.push(lonlat(leg.a.map((v, i) => v * sa + leg.c[i] * sb)));
  }
  return out;
}

const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export function Journey({ stops, flight, colors }: Props) {
  const [active, setActive] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /* Where the globe should turn to: set by the day being read. */
  const goal = useRef<(v: View) => void>(() => {});
  /* The canvas reads the day being read without being set up again. */
  const activeRef = useRef(active);

  useEffect(() => {
    const t = Date.now();
    nowRef.current = t;
    setNow(t);
  }, []);

  /* The day being read is the one across the middle of the screen. */
  useEffect(() => {
    const items = [
      ...(listRef.current?.querySelectorAll<HTMLElement>("[data-stop]") ?? []),
    ];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(items.indexOf(e.target as HTMLElement));
        }
      },
      /* On a phone the globe covers the top of the screen, so the day being
         read is the one across the middle of what is left under it. */
      {
        rootMargin: window.matchMedia("(max-width: 860px)").matches
          ? "-66% 0px -30% 0px"
          : "-48% 0px -48% 0px",
      },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const leaves = Date.parse(flight.leaves);
  const lands = Date.parse(flight.lands);
  const route = flight.stops.map((p) => p.ll);
  /* From the day it leaves, the flight is drawn as far as it has really
     got: planned, in faint dots, before it leaves; flown, as it flies. */
  const nowRef = useRef<number | null>(null);
  const viewOf = (i: number): View => {
    const st = stops[i];
    const t = nowRef.current;
    const real =
      t === null ? 1 : Math.min(1, Math.max(0, (t - leaves) / (lands - leaves)));
    const flown = Date.parse(st.at) >= leaves ? real : 0;
    /* A day with no place of its own is the flight: the globe looks at its
       middle, the top of the world. */
    const ll = st.ll ?? track(route, 2)[1];
    return { lon: ll[0], lat: Math.max(-50, Math.min(62, ll[1] - 6)), flown };
  };

  useEffect(() => {
    activeRef.current = active;
    goal.current(viewOf(active));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stops never change
  }, [active, now]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const g = ctx;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let mask: Uint8ClampedArray | null = null;
    const MW = 512;
    const MH = 256;
    let view: View = viewOf(0);
    let raf = 0;
    let turning: { from: View; to: View; at: number } | null = null;
    const path = track(route);
    /* The places pinned, once each: the first day each appears. */
    const pins = stops
      .map((st, i) => ({ st, i }))
      .filter(
        ({ st }, k, all) =>
          st.ll && all.findIndex((q) => q.st.place === st.place) === k,
      );

    const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
    const by: number[][] = Array.from({ length: BUCKETS }, () => []);
    const bc: string[][] = Array.from({ length: BUCKETS }, () => []);

    const land = (lon: number, lat: number) => {
      if (!mask) return false;
      const x = Math.floor((((((lon + 180) % 360) + 360) % 360) / 360) * MW) % MW;
      const y = Math.min(MH - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MH)));
      return mask[(y * MW + x) * 4] > 127;
    };

    const hexA = (hex: string, a: number) => {
      const v = parseInt(hex.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
    };

    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const narrow = w < 520;
      const R = Math.min(w, h) * 0.43;
      const cx = w / 2;
      const cy = h / 2;
      const l0 = view.lon * D;
      const p0 = view.lat * D;
      const sp = Math.sin(p0);
      const cp = Math.cos(p0);

      const halo = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.22);
      halo.addColorStop(0, hexA(EARTH_COLORS[2], 0.16));
      halo.addColorStop(1, hexA(EARTH_COLORS[2], 0));
      g.fillStyle = halo;
      g.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);

      /* Earth, in characters. */
      for (let b = 0; b < BUCKETS; b++) bx[b].length = by[b].length = bc[b].length = 0;
      const cw = narrow ? CELL.narrow : CELL.wide;
      const chh = cw * 1.72;
      const put = (X: number, Y: number, c: string, k: number, a: number) => {
        const b =
          k * LEVELS +
          Math.min(LEVELS - 1, Math.max(0, Math.floor(a * LEVELS - 0.001)));
        bx[b].push(X);
        by[b].push(Y);
        bc[b].push(c);
      };
      const gy0 = Math.floor((cy - R) / chh);
      const gy1 = Math.ceil((cy + R) / chh);
      const gx0 = Math.floor((cx - R) / cw);
      const gx1 = Math.ceil((cx + R) / cw);
      for (let gy = gy0; gy < gy1; gy++) {
        for (let gx = gx0; gx < gx1; gx++) {
          const X = (gx + 0.5) * cw;
          const Y = (gy + 0.5) * chh;
          const x = (X - cx) / R;
          const y = (cy - Y) / R;
          const d2 = x * x + y * y;
          if (d2 > 1) continue;
          const z = Math.sqrt(1 - d2);
          const id = gx * 131 + gy * 977;
          const lat = Math.asin(y * cp + z * sp) / D;
          const lon = (l0 + Math.atan2(x, z * cp - y * sp)) / D;
          const lambert = x * SUN[0] + y * SUN[1] + z * SUN[2];
          const isLand = land(lon, lat);
          if (lambert < 0.04) {
            if (isLand) {
              if (hash(id, 3) > 0.93) put(X, Y, "·", 5, 0.95);
              else if (hash(id, 1) < 0.3) put(X, Y, ".", 3, 0.45);
            } else if (hash(id, 2) < 0.16) put(X, Y, "·", 0, 0.9);
            continue;
          }
          const b = Math.max(0, lambert * 1.05 + 0.08);
          if (isLand) {
            put(
              X,
              Y,
              LAND[Math.min(LAND.length - 1, Math.floor(b * LAND.length))],
              b < 0.35 ? 3 : 4,
              b < 0.35 ? 0.55 : 0.85,
            );
            continue;
          }
          /* The lines of latitude and longitude, every 30°, faint over the sea. */
          const onLat = Math.abs(lat - Math.round(lat / 30) * 30) < 0.7;
          const onLon =
            Math.abs(wrap(lon - Math.round(lon / 30) * 30)) <
            0.9 / Math.max(0.2, Math.cos(lat * D));
          if ((onLat || onLon) && hash(id, 7) < 0.7) {
            put(X, Y, onLat ? "-" : "|", 1, 0.35 + b * 0.3);
            continue;
          }
          put(
            X,
            Y,
            OCEAN[Math.min(OCEAN.length - 1, Math.floor(b * OCEAN.length))],
            b < 0.3 ? 0 : b < 0.65 ? 1 : 2,
            0.9,
          );
        }
      }
      fillGlyphs(
        g,
        `${chh * 0.92}px ${mono}`,
        BUCKETS,
        (b) => EARTH_COLORS[Math.floor(b / LEVELS)],
        (b) => ((b % LEVELS) + 1) / LEVELS,
        bx,
        by,
        bc,
      );

      /* Places on the globe: on screen, and whether on the near side. */
      const at = ([lon, lat]: LonLat) => {
        const dl = lon * D - l0;
        const c = Math.cos(lat * D);
        const cosc = sp * Math.sin(lat * D) + cp * c * Math.cos(dl);
        return {
          x: cx + c * Math.sin(dl) * R,
          y: cy - (cp * Math.sin(lat * D) - sp * c * Math.cos(dl)) * R,
          near: cosc > 0.02,
        };
      };

      /* The flight: flown, in the award's colour; still to fly, faint. */
      const font = `${narrow ? 10 : 11}px ${mono}`;
      const gpu = glyphs();
      if (gpu) gpu.begin(g, font);
      else {
        g.font = font;
        g.textAlign = "center";
        g.textBaseline = "middle";
      }
      const put1 = (ch: string, x: number, y: number, col: string, a: number) => {
        if (gpu) {
          gpu.color(col, a);
          gpu.add(ch, x, y);
        } else {
          g.fillStyle = col;
          g.globalAlpha = a;
          g.fillText(ch, x, y);
        }
      };
      let head: { x: number; y: number } | null = null;
      path.forEach((p, k) => {
        const q = at(p);
        if (!q.near) return;
        const done = k / (path.length - 1) <= view.flown;
        if (done) {
          put1("•", q.x, q.y, colors[3], 0.95);
          head = q;
        } else if (k % 2 === 0) put1("·", q.x, q.y, colors[2], 0.5);
      });
      gpu?.end();
      g.globalAlpha = 1;
      if (head && view.flown > 0.01 && view.flown < 0.99) {
        const { x, y } = head;
        const glow = g.createRadialGradient(x, y, 0, x, y, 14);
        glow.addColorStop(0, hexA("#ffffff", 0.9));
        glow.addColorStop(0.3, hexA(colors[3], 0.4));
        glow.addColorStop(1, hexA(colors[3], 0));
        g.fillStyle = glow;
        g.fillRect(x - 14, y - 14, 28, 28);
      }

      /* The airports between, small. */
      g.font = `9px ${mono}`;
      g.textBaseline = "middle";
      for (const st of flight.stops.slice(1, -1)) {
        const q = at(st.ll);
        if (!q.near) continue;
        g.fillStyle = hexA(colors[3], 0.8);
        g.beginPath();
        g.arc(q.x, q.y, 1.6, 0, Math.PI * 2);
        g.fill();
        g.textAlign = "right";
        g.fillStyle = hexA(EARTH_COLORS[3], 0.7);
        g.fillText(st.code, q.x - 6, q.y);
      }

      /* The places, pinned; the one being read is framed and dated. */
      const here = stops[activeRef.current];
      for (const { st } of pins) {
        const q = at(st.ll as LonLat);
        if (!q.near) continue;
        const on = here.place === st.place;
        g.strokeStyle = hexA(colors[3], on ? 1 : 0.7);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(q.x, q.y, on ? 5 : 3.5, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = hexA(on ? "#ffffff" : colors[3], 1);
        g.beginPath();
        g.arc(q.x, q.y, 1.6, 0, Math.PI * 2);
        g.fill();
        g.font = `${on ? 12 : 11}px ${mono}`;
        g.textAlign = "left";
        g.fillStyle = hexA(on ? "#f2f5f8" : EARTH_COLORS[3], on ? 1 : 0.75);
        g.fillText(st.place, q.x + 12, q.y - (on ? 6 : 0));
        if (on) {
          g.font = `10px ${mono}`;
          g.fillStyle = hexA(colors[3], 0.9);
          g.fillText(here.when, q.x + 12, q.y + 9);
          const rr = 11;
          g.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2 + Math.PI / 4;
            g.moveTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
            g.lineTo(q.x + Math.cos(a) * (rr + 6), q.y + Math.sin(a) * (rr + 6));
          }
          g.stroke();
        }
      }
    }

    /* Drawn only when asked: a turn in progress, a drag, a resize. */
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    function tick(t: number) {
      raf = 0;
      if (turning) {
        const k = calm ? 1 : Math.min(1, (t - turning.at) / TURN);
        const e = ease(k);
        const { from, to } = turning;
        view = {
          lon: from.lon + wrap(to.lon - from.lon) * e,
          lat: from.lat + (to.lat - from.lat) * e,
          flown: from.flown + (to.flown - from.flown) * e,
        };
        if (k < 1) ask();
        else turning = null;
      }
      draw();
    }

    goal.current = (to) => {
      turning = { from: view, to, at: performance.now() };
      ask();
    };

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
      ask();
    };

    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = MW;
      c.height = MH;
      const x = c.getContext("2d");
      if (!x) return;
      x.drawImage(img, 0, 0, MW, MH);
      mask = x.getImageData(0, 0, MW, MH).data;
      ask();
    };
    img.src = "/earth-land.png";

    /* A drag turns the globe under the pointer. */
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat };
      turning = null;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const R = Math.min(w, h) * 0.43;
      view = {
        ...view,
        lon: drag.lon - ((e.clientX - drag.x) / R) * 57,
        lat: Math.max(-80, Math.min(80, drag.lat + ((e.clientY - drag.y) / R) * 57)),
      };
      ask();
    };
    const onUp = () => {
      drag = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawn from props that never change
  }, []);

  return (
    <div className={s.journey}>
      <div className={s.globe}>
        <canvas
          ref={canvasRef}
          className={s.globeCanvas}
          role="img"
          aria-label={`A globe showing the trip: ${flight.stops.map((p) => p.code).join(", ")}.`}
        />
        <p className={s.globeHint} aria-hidden>
          Drag to turn
        </p>
      </div>
      <ol ref={listRef} className={s.log}>
        {stops.map((st, i) => {
          const soon = now !== null && now < Date.parse(st.at);
          return (
            <li
              key={st.at}
              data-stop
              data-active={i === active || undefined}
              data-soon={soon || undefined}
              className={s.stop}
            >
              <button
                type="button"
                className={s.stopButton}
                onClick={() => setActive(i)}
              >
                <span className={s.stopWhen}>
                  <span className={s.stopMark} aria-hidden>
                    {soon ? "◌" : "•"}
                  </span>
                  {st.when}
                  <span className={s.stopPlace}>{st.place}</span>
                </span>
                <span className={s.stopTitle}>{st.title}</span>
                <span className={s.stopLine}>{st.line}</span>
                {soon && <span className={s.stopSoon}>Still to come</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
