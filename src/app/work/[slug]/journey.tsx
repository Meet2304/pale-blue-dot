"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { AwardStory, LonLat, Person } from "@/content/work";
import { hash } from "@/components/universe/bodies";
import { EARTH_COLORS } from "@/components/universe/encoding";
import { fillGlyphs, glyphs } from "@/components/universe/glyph-gl";
import { CELL, fit } from "@/components/universe/helpers";
import {
  createGlow,
  gatherGlow,
  rampAt,
  shadeSphere,
  shedGlow,
  smoothstep,
} from "@/components/universe/orb";

import { LinkedInMark } from "./platforms";
import { Prints, type Names } from "./prints";
import j from "./journey.module.css";

/**
 * The days of an award, read down one side, and the Earth on the other,
 * large, turning to wherever the day being read happened. It is drawn as
 * the site draws every body, a lit orb set in type (orb.ts): how much
 * light falls on a cell is told by how dense its character is, the land
 * brighter and paler than the sea, the sea throwing a glint where the sun
 * reflects in it, an atmosphere at the limb, and the night side dark but
 * for the faint shape of the land. A dark disc under it stops the sky at
 * its edge, and its own glow spills round it. Pointed at, the light moves
 * with the pointer, as if held up to a lamp. The coastlines are real
 * (`/earth-land.png`, Natural Earth's land at 1:110m), because here the
 * places matter.
 *
 * The flight is drawn on it as a ground track, flown as far as the day being
 * read: before it leaves, in faint dots; in the air, up to where the plane
 * is, with the plane a point of light; after it lands, all of it. Over the
 * top of the world, the northern lights come out round the magnetic pole.
 * Once it has landed, the globe comes a little nearer, and each day there
 * sends a ring out from it, as a ping; the way home is drawn as it's taken.
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
  /** The announcements of the wins, and their posts: shown with the day
      the wins were announced. */
  posts?: ReactNode;
};

/* Light from the upper left, as for every lit body on the site. */
const SUN = [-0.62, 0.42, 0.66];
const AURORA = ["'", ":", "|", "!"];
const LEVELS = 4;
const BUCKETS = 7 * LEVELS;
const D = Math.PI / 180;
const TURN = 1100;
const PING = 1600;
/* How much nearer the globe comes once the flight lands: a little, so it
   is always a whole orb. */
const CLOSE = 1.14;
/* The globe's radius, as a share of the smaller side of its box. */
const SIZE = 0.41;
/* How strongly the globe is drawn: it is the days' setting, not their
   subject, so it sits back; the flight, the pins and their names stay
   clear. */
const QUIET = 0.68;
/* The north geomagnetic pole, and how far from it the auroral oval runs. */
const POLE: LonLat = [-72.7, 80.7];
const OVAL = 21;

type View = {
  lon: number;
  lat: number;
  flown: number;
  zoom: number;
  glow: number;
  home: number;
};

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

export function Journey({ stops, flight, colors, people, posts }: Props) {
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
        home: 0,
      };
    }
    const landed = lastAir >= 0 ? i > lastAir : !!st.at && Date.parse(st.at) >= lands;
    /* A day with no place of its own is the flight: the globe looks at its
       middle, the top of the world. */
    const ll = st.ll ?? path[Math.round(path.length / 2)];
    const zoom = landed ? CLOSE : 1;
    return {
      lon: ll[0],
      lat: clamp(ll[1] - 8, -50, 62),
      flown: landed ? 1 : 0,
      zoom,
      glow: 0,
      home: st.home ?? 0,
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
    const el: HTMLCanvasElement = canvas;
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
    /* Where the light comes from, and where it's going: the sun's corner
       at rest, the pointer's while it's over the globe. */
    let light = [...SUN];
    let lightGoal = [...SUN];
    const glowBuf = createGlow();
    const homePath = flight.home
      ? track(
          flight.home.map((p) => p.ll),
          90,
        )
      : null;
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

    /* Land, read between the mask's pixels, so a coast is a line and not a
       staircase. */
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
      const R = Math.min(w, h) * SIZE * view.zoom;
      const cx = w / 2;
      const cy = h / 2;
      const l0 = view.lon * D;
      const p0 = view.lat * D;
      const sp = Math.sin(p0);
      const cp = Math.cos(p0);
      const L = light;

      /* The orb's own dark, so the sky stops at its limb. */
      shadeSphere(g, cx, cy, R, 1);

      /* Earth, in characters, and the northern lights where they're out. */
      for (let b = 0; b < BUCKETS; b++) bx[b].length = by[b].length = bc[b].length = 0;
      ax.length = ay.length = aa.length = ac.length = 0;
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
      const gy0 = Math.max(0, Math.floor((cy - R) / chh));
      const gy1 = Math.min(Math.ceil(h / chh), Math.ceil((cy + R) / chh));
      const gx0 = Math.max(0, Math.floor((cx - R) / cw));
      const gx1 = Math.min(Math.ceil(w / cw), Math.ceil((cx + R) / cw));
      const glow = view.glow;
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
          const lambert = x * L[0] + y * L[1] + z * L[2];
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
          const day = smoothstep(-0.16, 0.6, lambert);
          /* Atmosphere: brightest at the limb, on the lit side. */
          const air = (1 - z) ** 3 * smoothstep(-0.25, 0.45, lambert);
          if (day < 0.05) {
            /* Night: the land's shape, faintly; the sea all but empty. */
            if (isLand) {
              if (hash(id, 1) < 0.34) put(X, Y, "·", 1, 0.5);
            } else if (air > 0.05) put(X, Y, "·", 1, 0.3 + air);
            else if (hash(id, 2) < 0.04) put(X, Y, "·", 0, 0.6);
            continue;
          }
          /* The sun's glint on the sea: where the reflected light meets the
             eye. */
          const glint = isLand ? 0 : Math.max(0, 2 * lambert * z - L[2]) ** 24;
          /* How dense: the light on the surface. How bright: that, and the
             air at the limb, which glows rather than thickens. */
          const v = Math.min(1, day * (isLand ? 0.62 : 0.36 + glint * 0.5) + air * 0.1);
          const lit = Math.min(1, v + air * 0.5);
          const k = isLand
            ? lit > 0.5
              ? 4
              : 3
            : glint > 0.3 || air > 0.35
              ? 4
              : lit > 0.28
                ? 2
                : lit > 0.14
                  ? 1
                  : 0;
          put(X, Y, rampAt(v), k, Math.min(1, 0.3 + lit * 0.75));
        }
      }
      fillGlyphs(
        g,
        `${chh * 0.92}px ${mono}`,
        BUCKETS,
        (b) => EARTH_COLORS[Math.floor(b / LEVELS)],
        (b) => (((b % LEVELS) + 1) / LEVELS) * QUIET,
        bx,
        by,
        bc,
      );

      const font = `${narrow ? 10 : 12}px ${mono}`;
      const batch = () => {
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
        const end = () => {
          gpu?.end();
          g.globalAlpha = 1;
        };
        return { put1, end };
      };

      /* The lights, then the orb's own glow over all of it (orb.ts). */
      if (ax.length) {
        const lights = batch();
        for (let k = 0; k < ax.length; k++)
          lights.put1(ac[k], ax[k], ay[k], aa[k] > 0.6 ? colors[3] : colors[2], aa[k]);
        lights.end();
      }
      gatherGlow(glowBuf, el);
      shedGlow(g, glowBuf, 0, 0, el.width, el.height, 0.6);

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

      /* The flight, and the way home: flown, in the award's colour, with
         the plane a point of light at its head; still to fly, faint. */
      const lamp = (x: number, y: number) => {
        const r = 18;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, hexA("#ffffff", 0.95));
        grad.addColorStop(0.3, hexA(colors[3], 0.45));
        grad.addColorStop(1, hexA(colors[3], 0));
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const trackOf = (pts: LonLat[], flown: number, dim: boolean) => {
        const line = batch();
        let head: { x: number; y: number } | null = null;
        pts.forEach((p, k) => {
          const q = at(p);
          if (!q.near) return;
          if (k / (pts.length - 1) <= flown) {
            line.put1("•", q.x, q.y, colors[3], 0.95);
            head = q;
          } else if (!dim && k % 2 === 0) line.put1("·", q.x, q.y, colors[2], 0.5);
        });
        line.end();
        return head as { x: number; y: number } | null;
      };
      const head = trackOf(path, view.flown, false);
      if (head && view.flown > 0.01 && view.flown < 0.99) lamp(head.x, head.y);
      if (homePath && view.home > 0.01) {
        const back = trackOf(homePath, view.home, true);
        if (back && view.home < 0.99) lamp(back.x, back.y);
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

      /* The places, pinned; the one being read is framed and dated. */
      const here = stops[activeRef.current];
      const big = narrow ? 12 : 15;
      /* A place is pinned once the story reaches it, but for where the
         flight is bound, which its track already points to. */
      const bound = flight.stops[flight.stops.length - 1].ll;
      for (const { st, i } of pins) {
        const ll = st.ll as LonLat;
        const q = at(ll);
        if (!q.near) continue;
        const toward = Math.hypot(ll[0] - bound[0], ll[1] - bound[1]) < 2;
        if (i > activeRef.current && !toward) continue;
        const on = here.place === st.place && !!here.ll;
        const halo = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, on ? 16 : 9);
        halo.addColorStop(0, hexA(colors[3], on ? 0.55 : 0.3));
        halo.addColorStop(1, hexA(colors[3], 0));
        g.fillStyle = halo;
        g.fillRect(q.x - 16, q.y - 16, 32, 32);
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
        g.shadowColor = "rgba(0,0,0,0.9)";
        g.shadowBlur = 6;
        g.fillStyle = hexA(on ? "#f2f5f8" : EARTH_COLORS[3], on ? 1 : 0.75);
        g.fillText(st.place, q.x + 14, q.y - (on ? 7 : 0));
        if (on) {
          g.font = `${big - 3}px ${mono}`;
          g.fillStyle = hexA(colors[3], 0.95);
          g.fillText(here.when, q.x + 14, q.y + 10);
        }
        g.shadowBlur = 0;
        if (on) {
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

    /* Drawn only when asked: a turn, a ping or the light moving, a drag, a
       resize; and not at all until the globe is within a screen of being
       seen, so the page's first moments are the head's alone. */
    let awake = false;
    const ask = () => {
      if (awake && !raf) raf = requestAnimationFrame(tick);
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
          zoom: from.zoom * (to.zoom / from.zoom) ** e,
          glow: from.glow + (to.glow - from.glow) * e,
          home: from.home + (to.home - from.home) * e,
        };
        if (k < 1) ask();
        else turning = null;
      }
      /* The light eases after the pointer. */
      const dl = Math.hypot(
        lightGoal[0] - light[0],
        lightGoal[1] - light[1],
        lightGoal[2] - light[2],
      );
      if (dl > 0.002) {
        light = calm
          ? [...lightGoal]
          : unit(light.map((v, i) => v + (lightGoal[i] - v) * 0.14));
        ask();
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
    const wake = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        wake.disconnect();
        awake = true;
        img.src = "/earth-land.png";
        ask();
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    wake.observe(el);
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

    /* A drag turns the globe under the pointer; pointed at, the light
       follows the pointer, as if the globe were held up to a lamp. */
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat };
      turning = null;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const R = Math.min(w, h) * SIZE * view.zoom;
      if (drag) {
        view = {
          ...view,
          lon: drag.lon - ((e.clientX - drag.x) / R) * 57,
          lat: clamp(drag.lat + ((e.clientY - drag.y) / R) * 57, -80, 80),
        };
        ask();
        return;
      }
      if (e.pointerType !== "mouse") return;
      const box = canvas.getBoundingClientRect();
      const px = (e.clientX - box.left - w / 2) / R;
      const py = (h / 2 - (e.clientY - box.top)) / R;
      lightGoal =
        Math.hypot(px, py) > 1.5 ? [...SUN] : unit([px * 0.95, py * 0.95, 0.55]);
      ask();
    };
    const onUp = () => {
      drag = null;
    };
    const onLeave = () => {
      lightGoal = [...SUN];
      ask();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wake.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
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
            posts={st.wins ? posts : undefined}
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
  posts,
}: {
  st: Stop;
  active: boolean;
  soon: boolean;
  onPick: () => void;
  people: Record<string, Person>;
  names: Names;
  posts?: ReactNode;
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
      {posts && <div className={j.dayExtra}>{posts}</div>}
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
