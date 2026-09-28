"use client";

import { useEffect, useRef } from "react";

import { COLLECTIONS, type Kind } from "@/content/work";

import { EARTH_COLORS, KINDS, colorsOf, layout } from "./encoding";
import { buildGalaxy, drawGalaxy, type Galaxy } from "./galaxy";
import { fit, mulberry32 } from "./helpers";
import { drawBody, makeFrame } from "./render";

/**
 * One universe, one camera, driven by scroll.
 *
 *   step 0      Earth, close, with its orbits: the pale blue dot up close.
 *   step 1      pull back: Earth becomes the dot, and everything else appears
 *               around it, each body sending its light home.
 *   step 2..6   the camera flies to each collection, newest to oldest.
 *   step 7      back out to the whole map.
 *
 * Between keyframes the camera holds still for a moment (so the text beside
 * it can be read), then moves; zoom is interpolated in log space so the
 * pull-back from a planet to a pixel reads as one continuous move.
 */

const TILT = (23.4 * Math.PI) / 180;
const ORBITS = [
  { r: 1.3, inc: 0.35, node: 0.2, speed: 0.22, n: 420 },
  { r: 1.55, inc: -0.6, node: 1.2, speed: -0.14, n: 360 },
  { r: 1.85, inc: 0.9, node: 2.4, speed: 0.09, n: 300 },
];

type Cam = { x: number; y: number; z: number; ax: number; ay: number; gi?: number };

export function UniverseCanvas({
  filter,
  hoverRef,
  onPick,
  className,
}: {
  filter: Kind | "all";
  hoverRef: { current: string | null };
  onPick: (collection: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const filterRef = useRef(filter);
  const pickRef = useRef(onPick);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = canvas.closest("[data-universe]") as HTMLElement | null;
    const rnd = mulberry32(5);
    const { placed, groups } = layout();

    /* Everything circles the pale blue dot. Each year's cluster orbits on
       its own ellipse (the map is seen at an angle, so circles flatten to
       0.72), and further out is slower, as orbits are. */
    const FLAT = 0.72;
    const orbitR = groups.map((gr) => Math.hypot(gr.x, gr.y / FLAT));
    const omega = orbitR.map((d) => 0.03 * Math.pow(14 / d, 1.5));
    const angle = groups.map(() => 0);
    const rot = (x: number, y: number, a: number) => {
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const Y = y / FLAT;
      return [x * c - Y * sn, (x * sn + Y * c) * FLAT] as const;
    };
    const live = Object.fromEntries(
      placed.map((p) => [p.id, { x: p.x, y: p.y }]),
    ) as Record<string, { x: number; y: number }>;
    const liveGroup = groups.map((gr) => ({ x: gr.x, y: gr.y }));
    const colors = Object.fromEntries(
      (Object.keys(KINDS) as Kind[]).map((k) => [
        k,
        colorsOf(KINDS[k].hue, KINDS[k].l, KINDS[k].c),
      ]),
    ) as Record<Kind, string[]>;
    const dim = Object.fromEntries(placed.map((p) => [p.id, 1])) as Record<
      string,
      number
    >;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let sans = "sans-serif";
    let raf = 0;
    let visible = true;
    let keys: Cam[] = [];
    let galaxy: Galaxy | null = null;

    const stars = Array.from({ length: 900 }, () => ({
      x: rnd(),
      y: rnd(),
      z: 0.2 + rnd() * 0.8,
      b: 0.15 + Math.pow(rnd(), 3) * 0.85,
      p: rnd() * 6,
    }));
    const orbits = ORBITS.map((o) => ({
      ...o,
      a: Array.from({ length: o.n }, () => rnd() * Math.PI * 2),
    }));

    let yaw = 0;
    let yawVel = 0.12;
    let tilt = TILT;
    const pointer = {
      x: -1e4,
      y: -1e4,
      in: false,
      down: false,
      lastX: 0,
      lastY: 0,
      moved: 0,
    };
    let hovered: string | null = null;
    let camNow: Cam = { x: 0, y: 0, z: 1, ax: 0.5, ay: 0.5 };

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
      sans = cs.getPropertyValue("--font-sans").trim() || "sans-serif";
      const narrow = w < 760;
      const m = Math.min(w, h);

      /* The map's bounds, Earth included. */
      let x0 = -2;
      let x1 = 2;
      let y0 = -2;
      let y1 = 2;
      for (const p of placed) {
        x0 = Math.min(x0, p.x - p.r * 2);
        x1 = Math.max(x1, p.x + p.r * 2);
        y0 = Math.min(y0, p.y - p.r * 2);
        y1 = Math.max(y1, p.y + p.r * 2);
      }
      /* On a phone the copy stacks at the bottom of the screen, so every
         framing below it keeps to the top part of the screen instead. */
      const mapZ = Math.min(
        (w * (narrow ? 0.92 : 0.56)) / (x1 - x0),
        (h * (narrow ? 0.42 : 0.8)) / (y1 - y0),
      );
      const map: Cam = {
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        z: mapZ,
        ax: narrow ? 0.5 : 0.62,
        ay: narrow ? 0.27 : 0.5,
      };
      keys = [
        {
          x: 0,
          y: 0,
          z: m * (narrow ? 0.3 : 0.34),
          ax: narrow ? 0.5 : 0.63,
          ay: narrow ? 0.32 : 0.5,
        },
        map,
        ...groups.map((gr, gi) => ({
          gi,
          x: gr.x,
          y: gr.y,
          z: narrow
            ? (Math.min(w * 0.9, h * 0.4) / (2 * gr.r)) * 1.3
            : (Math.min(w * 0.5, h * 0.8) / (2 * gr.r)) * 1.3,
          ax: narrow ? 0.5 : 0.64,
          ay: narrow ? 0.27 : 0.5,
        })),
        { ...map, ax: 0.5, ay: narrow ? 0.27 : 0.46, z: mapZ * 0.9 },
      ];

      /* The galaxy's cells, measured once at the map's zoom, over a margin
         wide enough for both map framings and for the disc's slow turn. */
      const span = Math.max(x1 - x0, y1 - y0);
      const reach = (Math.hypot(w, h) * 0.62) / mapZ;
      galaxy = buildGalaxy({
        x0: map.x - reach,
        y0: map.y - reach,
        x1: map.x + reach,
        y1: map.y + reach,
        z: mapZ,
        cx: map.x + span * 0.08,
        cy: map.y - span * 0.04,
        radius: span * 0.8,
      });
    };

    const smooth = (k: number) => k * k * (3 - 2 * k);
    const camAt = (s: number): Cam => {
      const i = Math.max(0, Math.min(keys.length - 1, Math.floor(s)));
      const j = Math.min(keys.length - 1, i + 1);
      const local = Math.min(1, Math.max(0, (s - i - 0.22) / 0.62));
      const e = smooth(local);
      const at = (k: Cam) =>
        k.gi === undefined ? k : { ...k, x: liveGroup[k.gi].x, y: liveGroup[k.gi].y };
      const a = at(keys[i]);
      const b = at(keys[j]);
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e),
        ax: a.ax + (b.ax - a.ax) * e,
        ay: a.ay + (b.ay - a.ay) * e,
      };
    };

    const hexA = (hex: string, a: number) => {
      const v = parseInt(hex.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
    };

    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      for (let gi = 0; gi < groups.length; gi++) {
        if (!calm) angle[gi] += omega[gi] * dt;
        const [x, y] = rot(groups[gi].x, groups[gi].y, angle[gi]);
        liveGroup[gi].x = x;
        liveGroup[gi].y = y;
      }
      for (const p of placed) {
        const [x, y] = rot(p.x, p.y, angle[p.collection]);
        live[p.id].x = x;
        live[p.id].y = y;
      }

      let s = 0;
      if (section) {
        const top = section.getBoundingClientRect().top;
        s = Math.min(keys.length - 1, Math.max(0, -top / window.innerHeight));
      }
      const cam = camAt(s);
      camNow = cam;
      const toX = (x: number) => cam.ax * w + (x - cam.x) * cam.z;
      const toY = (y: number) => cam.ay * h + (y - cam.y) * cam.z;
      const narrow = w < 760;
      const f = filterRef.current;
      const focusGroup = s >= 1.5 && s < keys.length - 1.5 ? Math.round(s) - 2 : -1;

      if (!pointer.down && !calm) yawVel += (0.12 - yawVel) * 0.02;
      yaw += calm ? 0 : yawVel * dt;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);

      /* Stars, drifting a little with the camera for depth. */
      const zoomOut = Math.min(
        1,
        Math.max(0, (Math.log(keys[0].z) - Math.log(cam.z)) / 2),
      );
      g.fillStyle = "#dfe6f5";
      for (const st of stars) {
        const px = (((st.x * w - cam.x * cam.z * 0.004 * st.z) % w) + w) % w;
        const py = (((st.y * h - cam.y * cam.z * 0.004 * st.z) % h) + h) % h;
        g.globalAlpha =
          st.b * (0.4 + zoomOut * 0.4) * (calm ? 1 : 0.7 + 0.3 * Math.sin(t + st.p));
        g.fillRect(px, py, 1.1, 1.1);
      }
      g.globalAlpha = 1;

      /* The galaxy: full at the map, fading as the camera closes on a year
         or on Earth, when the bodies themselves take over. */
      const zq = Math.log(cam.z / keys[1].z);
      const galaxyA = Math.max(0, Math.min(1, zq <= 0 ? 1 : 1 - zq / Math.log(3)));
      if (galaxy && galaxyA > 0.01) {
        drawGalaxy(g, galaxy, {
          toX,
          toY,
          z: cam.z,
          w,
          h,
          t,
          alpha: galaxyA,
          rot: calm ? 0 : t * 0.006,
          calm,
          mono,
        });
      }

      /* Which bodies the filter keeps. */
      for (const p of placed) {
        const target = f === "all" || f === p.kind ? 1 : 0.12;
        dim[p.id] += (target - dim[p.id]) * 0.1;
      }

      const ex = toX(0);
      const ey = toY(0);
      const earthR = cam.z;
      const mapness = Math.min(
        1,
        Math.max(0, 1 - (Math.log(cam.z) - Math.log(keys[1].z)) / 1.6),
      );

      /* The one thread home: from whatever is pointed at, back to Earth. */
      const thread = hovered ?? hoverRef.current;
      const tp = thread ? placed.find((q) => q.id === thread) : null;
      if (tp && mapness > 0.02) {
        g.setLineDash([2, 6]);
        g.lineDashOffset = calm ? 0 : t * 12;
        g.lineWidth = 1;
        g.strokeStyle = hexA(colors[tp.kind][3], 0.45 * mapness);
        g.beginPath();
        g.moveTo(toX(live[tp.id].x), toY(live[tp.id].y));
        g.lineTo(ex, ey);
        g.stroke();
        g.setLineDash([]);
      }
      if (mapness > 0.02) {
        /* Years, at each collection, in the quietest voice on the page. */
        g.font = `11px ${mono}`;
        g.textAlign = "center";
        g.textBaseline = "top";
        /* The orbits themselves: faint ellipses, one per year, around Earth. */
        g.lineWidth = 1;
        g.setLineDash([1, 6]);
        g.lineDashOffset = calm ? 0 : -t * 4;
        orbitR.forEach((d) => {
          g.strokeStyle = hexA("#9aa6bd", 0.16 * mapness);
          g.beginPath();
          g.ellipse(ex, ey, d * cam.z, d * FLAT * cam.z, 0, 0, Math.PI * 2);
          g.stroke();
        });
        g.setLineDash([]);
        groups.forEach((gr, i) => {
          g.fillStyle = hexA("#8b93a3", 0.55 * mapness);
          g.fillText(
            COLLECTIONS[i].tick,
            toX(liveGroup[i].x),
            toY(liveGroup[i].y) + gr.r * cam.z * 0.95,
          );
        });
      }

      /* The bodies. */
      hovered = null;
      let hoverD = 1e9;
      for (const p of placed) {
        const R = p.r * cam.z;
        const px = toX(live[p.id].x);
        const py = toY(live[p.id].y);
        const kind = KINDS[p.kind];
        const reach = R * 2.3;
        if (
          px + reach < -20 ||
          px - reach > w + 20 ||
          py + reach < -20 ||
          py - reach > h + 20
        )
          continue;
        const d = Math.hypot(pointer.x - px, pointer.y - py);
        if (pointer.in && d < Math.max(14, R * 1.3) && d < hoverD) {
          hoverD = d;
          hovered = p.id;
        }
        const a = dim[p.id];
        /* At a distance, a body is only a point of light; it resolves into
           its full form as the camera closes in. A phone frames each year
           smaller, so there it resolves sooner. */
        const bodyA = narrow
          ? smooth(Math.min(1, Math.max(0, (R - 14) / 26)))
          : smooth(Math.min(1, Math.max(0, (R - 26) / 44)));
        const pointA = 1 - bodyA;
        if (pointA > 0.01) {
          const tw = calm ? 1 : 0.86 + 0.14 * Math.sin(t * 1.3 + p.seed * 40);
          const pa = pointA * a * tw;
          const glowR = 5 + p.impact * 4.5;
          const grad = g.createRadialGradient(px, py, 0, px, py, glowR);
          grad.addColorStop(0, hexA(colors[p.kind][3], 0.75 * pa));
          grad.addColorStop(0.35, hexA(colors[p.kind][2], 0.28 * pa));
          grad.addColorStop(1, hexA(colors[p.kind][2], 0));
          g.fillStyle = grad;
          g.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
          /* The brightest carry diffraction spikes, like a telescope sees. */
          if (p.impact >= 2.3) {
            const L = 4 + p.impact * 5;
            g.lineWidth = 1;
            for (const [dx, dy, len] of [
              [1, 0, L],
              [0, 1, L * 0.8],
            ] as const) {
              const sg = g.createLinearGradient(
                px - dx * len,
                py - dy * len,
                px + dx * len,
                py + dy * len,
              );
              sg.addColorStop(0, hexA(colors[p.kind][3], 0));
              sg.addColorStop(0.5, hexA(colors[p.kind][4], 0.8 * pa));
              sg.addColorStop(1, hexA(colors[p.kind][3], 0));
              g.strokeStyle = sg;
              g.beginPath();
              g.moveTo(px - dx * len, py - dy * len);
              g.lineTo(px + dx * len, py + dy * len);
              g.stroke();
            }
          }
          g.fillStyle = hexA(colors[p.kind][4], pa);
          g.beginPath();
          g.arc(px, py, 0.9 + p.impact * 0.45, 0, Math.PI * 2);
          g.fill();
        }
        if (bodyA <= 0.01) continue;
        const glowR = Math.max(6, R * 2.2);
        const grad = g.createRadialGradient(px, py, 0, px, py, glowR);
        grad.addColorStop(
          0,
          hexA(colors[p.kind][2], 0.14 * a * bodyA * (0.5 + p.impact / 3)),
        );
        grad.addColorStop(1, hexA(colors[p.kind][2], 0));
        g.fillStyle = grad;
        g.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
        const cw = Math.max(2.4, Math.min(7, R * 0.16));
        const ch = cw * 1.72;
        const scan =
          (hovered === p.id || hoverRef.current === p.id) && R > 40
            ? { x: (pointer.x - px) / R, y: (pointer.y - py) / R, r: 0.45 }
            : null;
        drawBody(g, kind.body, {
          w,
          h,
          cx: px,
          cy: py,
          R,
          cw,
          ch,
          frame: makeFrame(
            t,
            0,
            0,
            scan && hovered === p.id ? scan : null,
            cw / R,
            ch / R,
            p.seed,
            calm,
          ),
          colors: colors[p.kind],
          alpha: a * bodyA,
          font: `${ch * 0.92}px ${mono}`,
        });
      }

      /* Earth. */
      const glyphAlpha = Math.min(1, Math.max(0, (earthR - 18) / 40));
      if (glyphAlpha > 0) {
        const cw = Math.max(2.4, Math.min(7, earthR * 0.03 + 3));
        const ecw = narrow ? 6 : Math.min(7, cw);
        const ech = ecw * 1.72;
        const earthScan =
          pointer.in &&
          Math.hypot(pointer.x - ex, pointer.y - ey) < earthR * 1.1 &&
          earthR > 80
            ? { x: (pointer.x - ex) / earthR, y: (pointer.y - ey) / earthR, r: 0.42 }
            : null;
        drawBody(g, "earth", {
          w,
          h,
          cx: ex,
          cy: ey,
          R: earthR,
          cw: ecw,
          ch: ech,
          frame: makeFrame(
            t,
            yaw,
            tilt,
            earthScan,
            ecw / earthR,
            ech / earthR,
            0,
            calm,
          ),
          colors: EARTH_COLORS,
          alpha: glyphAlpha * (focusGroup >= 0 ? 0.3 : 1),
          font: `${ech * 0.92}px ${mono}`,
        });
      }

      /* Earth's orbits, while it is big enough to have them. */
      const orbitAlpha = Math.min(1, Math.max(0, (earthR - 40) / 120));
      if (orbitAlpha > 0) {
        g.lineWidth = 1;
        for (const o of orbits) {
          const ci = Math.cos(o.inc);
          const si = Math.sin(o.inc);
          const cn = Math.cos(o.node);
          const sn = Math.sin(o.node);
          g.beginPath();
          for (let j = 0; j < o.a.length; j++) {
            if (!calm) o.a[j] += o.speed * dt * (0.8 + (j % 7) * 0.05);
            const proj = (a: number) => {
              const x0 = Math.cos(a) * o.r;
              const z0 = Math.sin(a) * o.r;
              const y1 = -z0 * si;
              const z1 = z0 * ci;
              return [
                ex + (x0 * cn - y1 * sn) * earthR,
                ey + (x0 * sn + y1 * cn) * earthR,
                z1,
              ] as const;
            };
            const [x1, y1, z1] = proj(o.a[j]);
            if (z1 < 0 && Math.hypot(x1 - ex, y1 - ey) < earthR) continue;
            const [x0, y0] = proj(o.a[j] - 0.05 * Math.sign(o.speed));
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
          }
          g.strokeStyle = hexA(
            EARTH_COLORS[3],
            0.35 * orbitAlpha * (focusGroup >= 0 ? 0.3 : 1),
          );
          g.stroke();
        }
      }

      /* Past the point where characters can draw it, Earth is only light,
         and it glows brighter for everything sent home to it. */
      if (glyphAlpha < 1) {
        const a = 1 - glyphAlpha;
        const r = Math.max(2, Math.min(earthR, 14));
        const glow = Math.min(r * 5, 26);
        const grad = g.createRadialGradient(ex, ey, 0, ex, ey, glow);
        grad.addColorStop(0, hexA(EARTH_COLORS[4], 0.95 * a));
        grad.addColorStop(0.12, hexA(EARTH_COLORS[2], 0.5 * a));
        grad.addColorStop(1, hexA(EARTH_COLORS[2], 0));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(ex, ey, glow, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hexA(EARTH_COLORS[4], a);
        g.beginPath();
        g.arc(ex, ey, Math.min(r * 0.5, 2.6), 0, Math.PI * 2);
        g.fill();
        if (mapness > 0.02) {
          g.font = `10px ${mono}`;
          g.textAlign = "left";
          g.textBaseline = "middle";
          g.fillStyle = hexA(EARTH_COLORS[3], 0.75 * mapness * a);
          g.fillText("you are here", ex + 12, ey + 1);
        }
      }

      /* Annotation, like a technical drawing: in a collection, every body
         gets a leader line and a label; on the map, only the one under the
         cursor or under a hovered row. */
      const labelled = placed.filter(
        (p) =>
          p.collection === focusGroup || p.id === hovered || p.id === hoverRef.current,
      );
      const focusAmt =
        focusGroup >= 0 ? 1 - Math.min(1, Math.abs(s - (focusGroup + 2)) * 2.4) : 0;
      /* Each label tries four places (up and out on its preferred side, then
         the other side, then below) and takes the first that is on screen and
         clear of the labels already placed this frame; failing that, the one
         that spills least. */
      const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
      /* Where labels may go: below the filter, clear of the copy (left of
         the canvas on a wide screen, the lower part on a phone) and of the
         chapter ticks on the right. */
      const free = narrow
        ? { x0: 4, x1: w - 4, y0: 52, y1: h * 0.52 }
        : { x0: Math.min(w * 0.06 + 450, w * 0.45), x1: w - 90, y0: 52, y1: h - 4 };
      for (const p of labelled) {
        const R = p.r * cam.z;
        const px = toX(live[p.id].x);
        const py = toY(live[p.id].y);
        const isFocus = p.collection === focusGroup;
        const a =
          (isFocus ? focusAmt : 1) * Math.max(dim[p.id], p.id === hovered ? 1 : 0);
        if (a < 0.02) continue;
        const kind = KINDS[p.kind];
        /* A phone has room for the name alone; the kind and dates are in the
           row just below. */
        const sub = narrow ? "" : `${kind.mark} ${kind.bodyName}, ${p.when}`;
        g.font = `400 13px ${sans}`;
        const tw0 = g.measureText(p.name).width;
        g.font = `11px ${mono}`;
        const tw = Math.max(tw0, g.measureText(sub).width);
        const pref = px < w * (narrow ? 0.5 : 0.7) ? 1 : -1;
        const r0 = Math.max(8, R * 1.15);
        const spot = (dir: number, up: number) => {
          const sx = px + dir * r0 * 0.72;
          const sy = py - up * r0 * 0.72;
          const kx = sx + dir * 26;
          const ky = sy - up * 26;
          const lx = kx + dir * 14;
          const tx = lx + dir * 6;
          const box = {
            x0: dir > 0 ? tx : tx - tw,
            x1: dir > 0 ? tx + tw : tx,
            y0: ky - 10,
            y1: ky + (sub ? 24 : 8),
          };
          return { dir, sx, sy, kx, ky, lx, box };
        };
        const options = [
          spot(pref, 1),
          spot(-pref, 1),
          spot(pref, -1),
          spot(-pref, -1),
        ];
        const spill = (b: (typeof options)[number]["box"]) =>
          Math.max(0, free.x0 - b.x0) +
          Math.max(0, b.x1 - free.x1) +
          Math.max(0, free.y0 - b.y0) +
          Math.max(0, b.y1 - free.y1) +
          boxes.reduce(
            (sum, o) =>
              sum +
              Math.max(0, Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0)) *
                (Math.min(b.y1, o.y1) > Math.max(b.y0, o.y0) ? 1 : 0),
            0,
          );
        const { dir, sx, sy, kx, ky, box, ...rest } = options.reduce((best, o) =>
          spill(o.box) < spill(best.box) ? o : best,
        );
        /* Last resort: slide the text back on screen rather than cut it. */
        const shift = Math.max(0, 4 - box.x0) - Math.max(0, box.x1 - (w - 4));
        const lx = rest.lx + shift;
        boxes.push({ ...box, x0: box.x0 + shift, x1: box.x1 + shift });
        g.strokeStyle = hexA("#c9d0dc", 0.5 * a);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(kx, ky);
        g.lineTo(lx, ky);
        g.stroke();
        g.textAlign = dir > 0 ? "left" : "right";
        g.textBaseline = "alphabetic";
        g.font = `400 13px ${sans}`;
        g.fillStyle = hexA("#eef0f4", a);
        g.fillText(p.name, lx + dir * 6, ky + 4);
        g.font = `11px ${mono}`;
        if (sub) {
          g.fillStyle = hexA(colors[p.kind][3], 0.85 * a);
          g.fillText(sub, lx + dir * 6, ky + 20);
        }

        /* The one being pointed at gets a reticle: four ticks, no circle. */
        if (p.id === hovered || p.id === hoverRef.current) {
          const rr = Math.max(10, R * 1.3);
          g.strokeStyle = hexA(colors[p.kind][3], 0.8);
          g.beginPath();
          for (let q = 0; q < 4; q++) {
            const ang = (q * Math.PI) / 2 + Math.PI / 4;
            g.moveTo(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr);
            g.lineTo(px + Math.cos(ang) * (rr + 8), py + Math.sin(ang) * (rr + 8));
          }
          g.stroke();
        }
      }
      canvas.style.cursor = hovered ? "pointer" : "";
    };

    resize();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (pointer.down) {
        yawVel = (x - pointer.lastX) * 0.9;
        tilt = Math.max(-0.2, Math.min(0.9, tilt + (y - pointer.lastY) * 0.004));
        pointer.moved += Math.abs(x - pointer.lastX) + Math.abs(y - pointer.lastY);
      }
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.x = x;
      pointer.y = y;
      pointer.in = e.target === canvas;
    };
    const onDown = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.lastX = e.clientX - box.left;
      pointer.lastY = e.clientY - box.top;
      pointer.moved = 0;
      /* Dragging spins the Earth only while it is big enough to hold. */
      pointer.down =
        camNow.z > 60 &&
        Math.hypot(pointer.lastX - camNow.ax * w, pointer.lastY - camNow.ay * h) <
          camNow.z * 1.3;
    };
    const onUp = () => {
      pointer.down = false;
    };
    const onClick = () => {
      if (pointer.moved > 6 || !hovered) return;
      const p = placed.find((q) => q.id === hovered);
      if (p) pickRef.current(p.collection);
    };
    const onLeave = () => {
      pointer.in = false;
      pointer.down = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("click", onClick);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [hoverRef]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ touchAction: "pan-y" }}
    />
  );
}
