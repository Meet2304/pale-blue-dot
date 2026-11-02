"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AwardStory, LonLat, Person } from "@/content/work";
import { hash } from "@/components/universe/bodies";
import { EARTH_COLORS } from "@/components/universe/encoding";
import { fillGlyphs, glyphs } from "@/components/universe/glyph-gl";
import { CELL, fit } from "@/components/universe/helpers";

import { LinkedInMark } from "./platforms";
import { Prints, type Names } from "./prints";
import j from "./journey.module.css";

/**
 * The days of an award, read down one side, and the Earth on the other,
 * large, turning to wherever the day being read happened. It is the site's
 * Earth, set in the same characters (bodies.ts), but with the real
 * coastlines (`/earth-land.png`, Natural Earth's land at 1:110m, white on
 * black), because here the places matter.
 *
 * The flight is drawn on it as a ground track, flown as far as the day being
 * read: before it leaves, in faint dots; in the air, up to where the plane
 * is, with the plane a point of light; after it lands, all of it. Over the
 * top of the world, the northern lights come out round the magnetic pole.
 * Once it has landed, the globe comes in close on where it landed, and
 * each day there sends a ring out from it, as a ping.
 *
 * Each day can carry its photographs (prints.tsx), which develop in the
 * first time it is read, and the people who were there, named and linked
 * to their LinkedIn; pointed at, a name is framed in the photographs.
 *
 * Nothing turns on its own. The globe turns when the reader moves to
 * another day (or picks one), and under a drag; between those it is still,
 * and drawn only when something changes.
 */

type Days = AwardStory["days"];
type Stop = Days["stops"][number];
type Props = {
  stops: Stop[];
  flight: NonNullable<Days["flight"]>;
  /** The award's colours, as the map draws its body (looks.ts). */
  colors: string[];
  people: Person[];
};

/* Light from the upper left, as for every lit body on the site. */
const SUN = [-0.62, 0.42, 0.66];
const OCEAN = ["·", "-", "~", "≈"];
const LAND = [".", ",", ":", ";", "+"];
const AURORA = ["'", ":", "|", "!"];
const LEVELS = 4;
const BUCKETS = 7 * LEVELS;
const D = Math.PI / 180;
const TURN = 1100;
const PING = 1600;
/* How close the globe comes in on where the flight lands. */
const CLOSE = 2.3;
/* The globe's radius, as a share of the smaller side of its box. */
const SIZE = 0.46;
/* The north geomagnetic pole, and how far from it the auroral oval runs. */
const POLE: LonLat = [-72.7, 80.7];
const OVAL = 21;

type View = { lon: number; lat: number; flown: number; zoom: number; glow: number };

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
const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: number[]) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return a.map((v) => v / l);
};

/* The flight as a run of points along great circles, spaced evenly by
   distance, so "how much is flown" reads as distance flown. */
function track(stops: LonLat[], n = 240): LonLat[] {
  const legs = stops.slice(1).map((b, i) => {
    const a = vec(stops[i]);
    const c = vec(b);
    const w = Math.acos(Math.max(-1, Math.min(1, dot3(a, c))));
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
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function Journey({ stops, flight, colors, people }: Props) {
  const [active, setActive] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /* Where the globe should turn to: set by the day being read. */
  const goal = useRef<(v: View, ping: LonLat | null) => void>(() => {});
  /* The canvas reads the day being read without being set up again. */
  const activeRef = useRef(active);

  const route = useMemo(() => flight.stops.map((p) => p.ll), [flight]);
  const path = useMemo(() => track(route), [route]);
  const byId = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people],
  );
  const names: Names = useMemo(
    () => ({ me: "Me", ...Object.fromEntries(people.map((p) => [p.id, p.name])) }),
    [people],
  );

  /* The visitor's clock, which the server can't know. */
  useEffect(() => {
    setNow(Date.now());
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
          ? "-62% 0px -34% 0px"
          : "-46% 0px -50% 0px",
      },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* The last day in the air: after it, the flight has landed. */
  const lastAir = stops.findLastIndex((st) => st.along !== undefined);
  const lands = Date.parse(flight.lands);
  const viewOf = (i: number): View => {
    const st = stops[i];
    if (st.along !== undefined) {
      const [lon, lat] = path[Math.round(st.along * (path.length - 1))];
      return {
        lon,
        lat: clamp(lat - 6, -50, 62),
        flown: st.along,
        zoom: 1,
        glow: st.aurora ? 1 : 0,
      };
    }
    const landed = lastAir >= 0 ? i > lastAir : !!st.at && Date.parse(st.at) >= lands;
    /* A day with no place of its own is the flight: the globe looks at its
       middle, the top of the world. */
    const ll = st.ll ?? path[Math.round(path.length / 2)];
    const zoom = landed ? CLOSE : 1;
    return {
      lon: ll[0],
      lat: clamp(ll[1] - 6 / zoom, -50, 62),
      flown: landed ? 1 : 0,
      zoom,
      glow: 0,
    };
  };

  useEffect(() => {
    activeRef.current = active;
    goal.current(viewOf(active), stops[active].ll ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stops never change
  }, [active]);

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
    let ping: { ll: LonLat; at: number } | null = null;
    /* The places pinned, once each: the first day each appears. */
    const pins = stops
      .map((st, i) => ({ st, i }))
      .filter(
        ({ st }, k, all) =>
          st.ll && all.findIndex((q) => q.st.place === st.place) === k,
      );
    /* The magnetic pole, and two directions round it, to find the
       magnetic longitude the lights' curtains hang along. */
    const M = vec(POLE);
    const E1 = unit(cross(M, [0, 0, 1]));
    const E2 = cross(M, E1);

    const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
    const by: number[][] = Array.from({ length: BUCKETS }, () => []);
    const bc: string[][] = Array.from({ length: BUCKETS }, () => []);
    const ax: number[] = [];
    const ay: number[] = [];
    const aa: number[] = [];
    const ac: string[] = [];

    /* Land, read between the mask's pixels, so a coast seen up close is a
       line and not a staircase. */
    const land = (lon: number, lat: number) => {
      const m = mask;
      if (!m) return false;
      const u = (((((lon + 180) % 360) + 360) % 360) / 360) * MW - 0.5;
      const v = clamp(((90 - lat) / 180) * MH - 0.5, 0, MH - 1.001);
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const fx = u - x0;
      const fy = v - y0;
      const at = (x: number, y: number) => m[(y * MW + ((x + MW) % MW)) * 4] / 255;
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
      return top * (1 - fy) + bottom * fy > 0.5;
    };

    const hexA = (hex: string, a: number) => {
      const v = parseInt(hex.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
    };

    function draw(t: number) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const narrow = w < 520;
      /* The globe's disc on screen (Rw) stays one size. Coming in close,
         the sphere behind it grows (R), and the disc becomes a lens on it,
         ringed and read out, as an instrument's would be. */
      const Rw = Math.min(w, h) * SIZE;
      const R = Rw * view.zoom;
      const lens = clamp((view.zoom - 1) / (CLOSE - 1), 0, 1);
      const cx = w / 2;
      const cy = h / 2;
      const l0 = view.lon * D;
      const p0 = view.lat * D;
      const sp = Math.sin(p0);
      const cp = Math.cos(p0);

      const halo = g.createRadialGradient(cx, cy, Rw * 0.9, cx, cy, Rw * 1.22);
      halo.addColorStop(0, hexA(EARTH_COLORS[2], 0.16));
      halo.addColorStop(1, hexA(EARTH_COLORS[2], 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, w, h);

      /* Earth, in characters, and the northern lights where they're out. */
      for (let b = 0; b < BUCKETS; b++) bx[b].length = by[b].length = bc[b].length = 0;
      ax.length = ay.length = aa.length = ac.length = 0;
      const cw = narrow ? CELL.narrow : CELL.wide;
      const chh = cw * 1.72;
      /* Through the lens, the characters fade out towards its rim. */
      let fade = 1;
      const put = (X: number, Y: number, c: string, k: number, a: number) => {
        const b =
          k * LEVELS +
          Math.min(LEVELS - 1, Math.max(0, Math.floor(a * fade * LEVELS - 0.001)));
        bx[b].push(X);
        by[b].push(Y);
        bc[b].push(c);
      };
      const gy0 = Math.max(0, Math.floor((cy - Rw) / chh));
      const gy1 = Math.min(Math.ceil(h / chh), Math.ceil((cy + Rw) / chh));
      const gx0 = Math.max(0, Math.floor((cx - Rw) / cw));
      const gx1 = Math.min(Math.ceil(w / cw), Math.ceil((cx + Rw) / cw));
      const glow = view.glow;
      for (let gy = gy0; gy < gy1; gy++) {
        for (let gx = gx0; gx < gx1; gx++) {
          const X = (gx + 0.5) * cw;
          const Y = (gy + 0.5) * chh;
          const wx = (X - cx) / Rw;
          const wy = (cy - Y) / Rw;
          const wd2 = wx * wx + wy * wy;
          if (wd2 > 1) continue;
          fade = lens > 0 ? 1 - lens * clamp((Math.sqrt(wd2) - 0.8) / 0.2, 0, 1) : 1;
          const x = wx / view.zoom;
          const y = wy / view.zoom;
          const d2 = x * x + y * y;
          const z = Math.sqrt(1 - d2);
          const id = gx * 131 + gy * 977;
          const lat = Math.asin(y * cp + z * sp) / D;
          const lon = (l0 + Math.atan2(x, z * cp - y * sp)) / D;
          const lambert = x * SUN[0] + y * SUN[1] + z * SUN[2];
          if (glow > 0.01) {
            /* The auroral oval: a band round the magnetic pole, hung in
               curtains along it, brightest on the night side. */
            const p = vec([lon, lat]);
            const off = Math.acos(clamp(dot3(p, M), -1, 1)) / D;
            const band = Math.exp(-(((off - OVAL) / 3.4) ** 2));
            if (band > 0.08) {
              const phi = Math.atan2(dot3(p, E2), dot3(p, E1));
              const folds = 0.55 + 0.45 * Math.sin(phi * 19 + 2.2 * Math.sin(phi * 5));
              const night = 1.1 - clamp(lambert, 0, 1) * 0.6;
              const a = band * folds * night * glow;
              if (a > 0.12 && hash(id, 9) < a * 1.3) {
                ax.push(X);
                ay.push(Y);
                aa.push(Math.min(1, a * 1.2));
                ac.push(
                  AURORA[Math.min(AURORA.length - 1, Math.floor(a * AURORA.length))],
                );
                continue;
              }
            }
          }
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
          const onLat = Math.abs(lat - Math.round(lat / 30) * 30) < 0.7 / view.zoom;
          const onLon =
            Math.abs(wrap(lon - Math.round(lon / 30) * 30)) <
            0.9 / view.zoom / Math.max(0.2, Math.cos(lat * D));
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
        const x = cx + c * Math.sin(dl) * R;
        const y = cy - (cp * Math.sin(lat * D) - sp * c * Math.cos(dl)) * R;
        /* Seen: on the near side, and inside the disc. */
        return { x, y, near: cosc > 0.02 && Math.hypot(x - cx, y - cy) <= Rw + 0.5 };
      };

      /* The lights, then the flight: flown, in the award's colour; still to
         fly, faint. */
      const font = `${narrow ? 10 : 12}px ${mono}`;
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
      for (let k = 0; k < ax.length; k++)
        put1(ac[k], ax[k], ay[k], aa[k] > 0.6 ? colors[3] : colors[2], aa[k]);
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
        const glowR = 18;
        const lamp = g.createRadialGradient(x, y, 0, x, y, glowR);
        lamp.addColorStop(0, hexA("#ffffff", 0.95));
        lamp.addColorStop(0.3, hexA(colors[3], 0.45));
        lamp.addColorStop(1, hexA(colors[3], 0));
        g.fillStyle = lamp;
        g.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
      }

      /* The airports between, small. */
      g.font = `10px ${mono}`;
      g.textBaseline = "middle";
      for (const st of flight.stops.slice(1, -1)) {
        const q = at(st.ll);
        if (!q.near) continue;
        g.fillStyle = hexA(colors[3], 0.8);
        g.beginPath();
        g.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
        g.fill();
        g.textAlign = "right";
        g.fillStyle = hexA(EARTH_COLORS[3], 0.7);
        g.fillText(st.code, q.x - 7, q.y);
      }

      /* A ping: two rings out from the place of the day just reached. */
      if (ping && t >= ping.at) {
        const q = at(ping.ll);
        const k = (t - ping.at) / PING;
        if (q.near && k < 1) {
          for (const lag of [0, 0.22]) {
            const e = clamp((k - lag) / (1 - lag), 0, 1);
            if (e <= 0 || e >= 1) continue;
            g.strokeStyle = hexA(colors[3], (1 - e) ** 1.6 * 0.85);
            g.lineWidth = 1;
            g.beginPath();
            g.arc(q.x, q.y, 6 + (1 - (1 - e) ** 3) * 58, 0, Math.PI * 2);
            g.stroke();
          }
        }
      }

      /* Close in, the lens's ring: a hairline with a tick every 15°, and
         where it looks, and how close, read out under it. */
      if (lens > 0.01) {
        const r0 = Rw + 6;
        g.strokeStyle = hexA(colors[3], 0.5 * lens);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, r0, 0, Math.PI * 2);
        for (let k = 0; k < 24; k++) {
          const a = (k * Math.PI) / 12;
          const r1 = r0 + (k % 6 === 0 ? 10 : 4);
          g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        }
        g.stroke();
        const deg = (v: number, pos: string, neg: string) =>
          `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
        g.font = `${narrow ? 10 : 11}px ${mono}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = hexA(colors[3], 0.85 * lens);
        g.fillText(
          `${deg(view.lat, "N", "S")}   ${deg(wrap(view.lon), "E", "W")}   ×${view.zoom.toFixed(1)}`,
          cx,
          Math.min(h - 10, cy + r0 + 24),
        );
      }

      /* The places, pinned; the one being read is framed and dated. */
      const here = stops[activeRef.current];
      const big = narrow ? 12 : 15;
      for (const { st } of pins) {
        const q = at(st.ll as LonLat);
        if (!q.near) continue;
        const on = here.place === st.place && !!here.ll;
        g.strokeStyle = hexA(colors[3], on ? 1 : 0.7);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(q.x, q.y, on ? 5.5 : 3.5, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = hexA(on ? "#ffffff" : colors[3], 1);
        g.beginPath();
        g.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
        g.fill();
        g.font = `${on ? big : big - 3}px ${mono}`;
        g.textAlign = "left";
        g.fillStyle = hexA(on ? "#f2f5f8" : EARTH_COLORS[3], on ? 1 : 0.75);
        g.fillText(st.place, q.x + 14, q.y - (on ? 7 : 0));
        if (on) {
          g.font = `${big - 3}px ${mono}`;
          g.fillStyle = hexA(colors[3], 0.9);
          g.fillText(here.when, q.x + 14, q.y + 10);
          const rr = 12;
          g.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2 + Math.PI / 4;
            g.moveTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
            g.lineTo(q.x + Math.cos(a) * (rr + 7), q.y + Math.sin(a) * (rr + 7));
          }
          g.stroke();
        }
      }
    }

    /* Drawn only when asked: a turn or a ping in progress, a drag, a
       resize. */
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
          /* In and out in even steps, as a lens does. */
          zoom: from.zoom * (to.zoom / from.zoom) ** e,
          glow: from.glow + (to.glow - from.glow) * e,
        };
        if (k < 1) ask();
        else turning = null;
      }
      if (ping && t < ping.at + PING) ask();
      draw(t);
    }

    goal.current = (to, at) => {
      const t = performance.now();
      turning = { from: view, to, at: t };
      ping = at && !calm ? { ll: at, at: t + TURN * 0.55 } : null;
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
      const R = Math.min(w, h) * SIZE * view.zoom;
      view = {
        ...view,
        lon: drag.lon - ((e.clientX - drag.x) / R) * 57,
        lat: clamp(drag.lat + ((e.clientY - drag.y) / R) * 57, -80, 80),
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
    <div className={j.journey}>
      <div className={j.globe}>
        <canvas
          ref={canvasRef}
          className={j.globeCanvas}
          role="img"
          aria-label={`A globe showing the trip: ${flight.stops.map((p) => p.code).join(", ")}.`}
        />
        <p className={j.globeHint} aria-hidden>
          Drag to turn
        </p>
      </div>
      <ol ref={listRef} className={j.log}>
        {stops.map((st, i) => (
          <Day
            key={`${st.when}-${st.title}`}
            st={st}
            active={i === active}
            soon={now !== null && !!st.at && now < Date.parse(st.at)}
            onPick={() => setActive(i)}
            people={byId}
            names={names}
          />
        ))}
      </ol>
    </div>
  );
}

/** One day: when and where, what happened, who was there, and its
    photographs, which develop in the first time it is read. */
function Day({
  st,
  active,
  soon,
  onPick,
  people,
  names,
}: {
  st: Stop;
  active: boolean;
  soon: boolean;
  onPick: () => void;
  people: Record<string, Person>;
  names: Names;
}) {
  const [shown, setShown] = useState(active);
  if (active && !shown) setShown(true);
  /* A name pointed at, framed in the photographs. */
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <li
      data-stop
      data-active={active || undefined}
      data-soon={soon || undefined}
      data-photos={st.photos ? "" : undefined}
      className={j.stop}
    >
      <button
        type="button"
        className={j.stopHead}
        onClick={onPick}
        aria-current={active ? "step" : undefined}
      >
        <span className={j.when}>
          <span className={j.mark} aria-hidden>
            {soon ? "◌" : "•"}
          </span>
          {st.when}
          <span className={j.place}>{st.place}</span>
        </span>
        <span className={j.title}>{st.title}</span>
        <span className={j.line}>{st.line}</span>
        {soon && <span className={j.soon}>Still to come</span>}
      </button>
      {st.with && (
        <p className={j.with}>
          <span className={j.withLabel}>With</span>
          {st.with.map((id) =>
            people[id] ? (
              <PersonName key={id} person={people[id]} onFocus={setFocus} />
            ) : null,
          )}
        </p>
      )}
      {st.photos && (
        <Prints
          photos={st.photos}
          rows={st.rows}
          shown={shown}
          focus={focus}
          names={names}
          sizes="(max-width: 860px) 92vw, 40vw"
          className={j.dayPrints}
        />
      )}
    </li>
  );
}

/**
 * A name, linked to the person's LinkedIn where they have one. Pointed at,
 * its LinkedIn mark takes its own blue and pops, a ring ripples out from
 * it once, a line draws in under the name, and what they do rises over it;
 * and they are framed in the day's photographs.
 */
export function PersonName({
  person,
  onFocus,
}: {
  person: Person;
  onFocus: (id: string | null) => void;
}) {
  const on = () => onFocus(person.id);
  const off = () => onFocus(null);
  const tip = person.role && (
    <span className={j.personTip} aria-hidden>
      {person.role}
    </span>
  );
  if (!person.linkedin)
    return (
      <span className={j.person} data-plain onPointerEnter={on} onPointerLeave={off}>
        <span className={j.personName}>{person.name}</span>
        {tip}
      </span>
    );
  return (
    <a
      href={person.linkedin}
      target="_blank"
      rel="noreferrer"
      className={j.person}
      onPointerEnter={on}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
      aria-label={`${person.name}${person.role ? `, ${person.role}` : ""}, on LinkedIn`}
    >
      <LinkedInMark className={j.personMark} />
      <span className={j.personName}>{person.name}</span>
      <span className={j.personArrow} aria-hidden>
        ↗
      </span>
      {tip}
    </a>
  );
}
