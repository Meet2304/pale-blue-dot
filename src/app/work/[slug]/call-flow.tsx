"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import s from "./call-flow.module.css";

/**
 * Vitamin Bob, explained in one picture that plays: a basic phone, the
 * phone lines, the district computer and where the call ends up, joined as
 * the story goes, one step every few seconds, with a line under it saying
 * what is happening. Drawn in the site's own terms (hairlines, Plex, the
 * award's colour), after the team's demo video.
 *
 *   1  Kevin rings once and hangs up: a missed call, free.
 *   2  The computer finds a free phone line.
 *   3  It calls him back, in Hindi.
 *   4  He answers a few questions on his keypad.
 *   5  The computer decides how urgent it is.
 *   6  An emergency: the nearest clinic is alerted.
 *   7  Not urgent: an appointment is booked.
 *   8  Free, in his language, with no internet.
 *
 * It keeps moving from one step to the next while it is on screen, round
 * and round; a dot jumps to its step and it carries on from there. It
 * can be paused, for whoever needs it still.
 * The same picture is laid out across on a wide screen and down on a
 * narrow one (two drawings of one layout table), so its words stay
 * readable on a phone.
 */

const STEP_MS = 3400;

type Box = { x: number; y: number; w: number; h: number };
type Layout = {
  view: [number, number];
  phone: Box;
  name: [number, number, "start" | "middle" | "end"];
  badge: [number, number];
  bubble: [number, number];
  rings: string[];
  nodes: [number, number][];
  nodesLabel: [number, number, "start" | "middle" | "end"];
  keys: [number, number][];
  arc: string;
  link: string;
  feed: string;
  screen: Box;
  base: string;
  label: [number, number];
  toClinic: string;
  toAppt: string;
  clinic: Box;
  appt: Box;
};

const WIDE: Layout = {
  view: [800, 270],
  phone: { x: 60, y: 96, w: 50, h: 96 },
  name: [85, 218, "middle"],
  badge: [85, 74],
  bubble: [120, 52],
  rings: ["M52 128 Q44 144 52 160", "M44 122 Q32 144 44 166"],
  nodes: [
    [230, 104],
    [230, 144],
    [230, 184],
  ],
  nodesLabel: [230, 80, "middle"],
  keys: [
    [134, 110],
    [164, 110],
  ],
  arc: "M95 94 C120 22 205 30 222 94",
  link: "M112 144 L218 144",
  feed: "M242 144 L300 144",
  screen: { x: 300, y: 96, w: 150, h: 92 },
  base: "M286 188 L464 188 L452 200 L298 200 Z",
  label: [375, 222],
  toClinic: "M452 136 C500 136 510 104 556 104",
  toAppt: "M452 152 C500 152 510 184 556 184",
  clinic: { x: 556, y: 80, w: 214, h: 48 },
  appt: { x: 556, y: 160, w: 214, h: 48 },
};

const TALL: Layout = {
  view: [360, 500],
  phone: { x: 155, y: 30, w: 50, h: 96 },
  name: [222, 70, "start"],
  badge: [124, 46],
  bubble: [216, 18],
  rings: ["M147 62 Q139 78 147 94", "M139 56 Q127 78 139 100"],
  nodes: [
    [140, 176],
    [180, 176],
    [220, 176],
  ],
  nodesLabel: [244, 180, "start"],
  keys: [
    [112, 134],
    [140, 134],
  ],
  arc: "M152 118 C112 124 112 150 131 166",
  link: "M180 128 L180 164",
  feed: "M180 188 L180 220",
  screen: { x: 105, y: 220, w: 150, h: 92 },
  base: "M91 312 L269 312 L257 324 L103 324 Z",
  label: [180, 346],
  toClinic: "M105 270 C56 270 94 360 94 414",
  toAppt: "M255 270 C304 270 266 360 266 414",
  clinic: { x: 14, y: 414, w: 160, h: 60 },
  appt: { x: 186, y: 414, w: 160, h: 60 },
};

export function CallFlow({ steps, label }: { steps: string[]; label: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* It plays only while most of it is on screen. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setSeen(entries[entries.length - 1].isIntersecting),
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !seen) return;
    const last = step === steps.length - 1;
    const id = window.setTimeout(
      () => setStep((n) => (n + 1) % steps.length),
      last ? STEP_MS * 1.6 : STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, seen, step, steps.length]);

  const n = step + 1;
  return (
    <div ref={ref} className={s.flow} data-step={n}>
      <div className={s.stage}>
        <Diagram L={WIDE} n={n} className={s.wide} />
        <Diagram L={TALL} n={n} className={s.tall} />
      </div>
      {/* Read out when stepped through by hand, not every few seconds. */}
      <p className={s.caption} aria-live={playing ? "off" : "polite"}>
        <span className={s.captionNum}>{String(n).padStart(2, "0")}</span>
        {steps[step]}
      </p>
      <div className={s.controls}>
        <button
          type="button"
          className={s.play}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <ol className={s.dots} aria-label={label}>
          {steps.map((t, i) => (
            <li key={t}>
              <button
                type="button"
                aria-label={`Step ${i + 1}: ${t}`}
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** One drawing of the call, at step `n`, in layout `L`. */
function Diagram({ L, n, className }: { L: Layout; n: number; className: string }) {
  const on = (b: boolean) => (b ? "" : undefined);
  const missed = n >= 1;
  const found = n >= 2;
  const connected = n >= 3;
  const gauge = n >= 5;
  const verdict =
    n === 5 ? "deciding" : n === 6 ? "emergency" : n >= 7 ? "routine" : "";
  const p = L.phone;
  const sc = L.screen;
  const cx = sc.x + sc.w / 2;
  const [bx, by] = L.bubble;
  return (
    <svg
      className={`${s.svg} ${className}`}
      viewBox={`0 0 ${L.view[0]} ${L.view[1]}`}
      aria-hidden
    >
      {/* The missed call: a ring that never connects, free. */}
      <path
        className={s.arc}
        d={L.arc}
        pathLength={1}
        data-on={on(n === 1 || n === 2)}
      />
      <g className={s.badge} data-on={on(missed)}>
        <rect x={L.badge[0] - 18} y={L.badge[1] - 10} width={36} height={20} rx={10} />
        <text x={L.badge[0]} y={L.badge[1] + 4}>
          ₹0
        </text>
      </g>

      {/* The phone. */}
      <g className={s.phone} data-ring={on(n === 3)} data-lit={on(connected)}>
        <rect className={s.body} x={p.x} y={p.y} width={p.w} height={p.h} rx={9} />
        <rect
          className={s.screen}
          x={p.x + 7}
          y={p.y + 9}
          width={p.w - 14}
          height={24}
          rx={3}
        />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            className={s.key}
            x={p.x + 9 + (i % 3) * 11}
            y={p.y + 42 + Math.floor(i / 3) * 12}
            width={8}
            height={7}
            rx={1.5}
          />
        ))}
      </g>
      {L.rings.map((d) => (
        <path key={d} className={s.ring} d={d} data-on={on(n === 3)} />
      ))}
      <text className={s.name} x={L.name[0]} y={L.name[1]} textAnchor={L.name[2]}>
        Kevin
      </text>
      <text className={s.sub} x={L.name[0]} y={L.name[1] + 15} textAnchor={L.name[2]}>
        basic phone · Hindi
      </text>

      {/* "Hello!", in Hindi, as the call comes back. */}
      <g className={s.bubble} data-on={on(n === 3)}>
        <rect x={bx} y={by} width={74} height={26} rx={6} />
        <text x={bx + 37} y={by + 18}>
          नमस्ते!
        </text>
      </g>

      {/* His answers, on the keypad. */}
      {L.keys.map(([kx, ky], i) => (
        <g
          key={i}
          className={s.keyAnswer}
          data-on={on(n === 4)}
          style={{ "--d": `${i * 700}ms` } as CSSProperties}
        >
          <rect x={kx} y={ky} width={22} height={22} rx={4} />
          <text x={kx + 11} y={ky + 15}>
            {i + 1}
          </text>
        </g>
      ))}

      {/* The phone lines; the one found free is ticked. */}
      <path className={s.wire} d={L.link} />
      <path className={s.live} d={L.link} pathLength={1} data-on={on(connected)} />
      <text
        className={s.sub}
        x={L.nodesLabel[0]}
        y={L.nodesLabel[1]}
        textAnchor={L.nodesLabel[2]}
      >
        phone lines
      </text>
      {L.nodes.map(([x, y], i) => (
        <g key={i} className={s.node} data-on={on(found && i === 1)}>
          <circle cx={x} cy={y} r={11} />
          {i === 1 ? (
            <path className={s.tick} d={`M${x - 4.5} ${y} l3 3.2 l6 -6.4`} />
          ) : (
            <circle className={s.nodeDot} cx={x} cy={y} r={2} />
          )}
        </g>
      ))}
      <path className={s.wire} d={L.feed} />
      <path className={s.live} d={L.feed} pathLength={1} data-on={on(connected)} />

      {/* The district computer: its own AI, no internet. */}
      <rect className={s.laptop} x={sc.x} y={sc.y} width={sc.w} height={sc.h} rx={6} />
      <path className={s.laptopBase} d={L.base} />
      <g className={s.chip} data-on={on(!gauge)}>
        <rect x={cx - 14} y={sc.y + sc.h / 2 - 14} width={28} height={28} rx={4} />
        <rect x={cx - 6} y={sc.y + sc.h / 2 - 6} width={12} height={12} rx={1.5} />
      </g>
      <g className={s.gauge} data-on={on(gauge)} data-verdict={verdict || undefined}>
        <text className={s.verdict} x={cx} y={sc.y + 26}>
          {verdict === "emergency"
            ? "Emergency"
            : verdict === "routine"
              ? "Not urgent"
              : "Listening…"}
        </text>
        <g transform={`translate(${cx} ${sc.y + sc.h - 16})`}>
          <path className={s.gaugeOk} d="M-30 0 A30 30 0 0 1 0 -30" />
          <path className={s.gaugeBad} d="M0 -30 A30 30 0 0 1 30 0" />
          <line className={s.needle} x1={0} y1={0} x2={0} y2={-24} />
          <circle className={s.hub} r={3} />
        </g>
      </g>
      <text className={s.name} x={L.label[0]} y={L.label[1]} textAnchor="middle">
        District computer
      </text>
      <text className={s.sub} x={L.label[0]} y={L.label[1] + 15} textAnchor="middle">
        its own AI · no internet
      </text>

      {/* Where the call ends up. */}
      <path className={s.wire} d={L.toClinic} />
      <path
        className={s.live}
        d={L.toClinic}
        pathLength={1}
        data-on={on(n >= 6)}
        data-tone="bad"
      />
      <path className={s.wire} d={L.toAppt} />
      <path className={s.live} d={L.toAppt} pathLength={1} data-on={on(n >= 7)} />
      <Card
        box={L.clinic}
        icon="clinic"
        title="Nearest clinic"
        status="Alerted now"
        on={n >= 6}
        tone="bad"
      />
      <Card
        box={L.appt}
        icon="appt"
        title="Appointment"
        status="Booked for tomorrow"
        on={n >= 7}
      />
    </svg>
  );
}

function Card({
  box,
  icon,
  title,
  status,
  on,
  tone,
}: {
  box: Box;
  icon: "clinic" | "appt";
  title: string;
  status: string;
  on: boolean;
  tone?: "bad";
}) {
  const ix = box.x + 14;
  const iy = box.y + box.h / 2 - 8;
  return (
    <g className={s.card} data-on={on ? "" : undefined} data-tone={tone}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} />
      {icon === "clinic" ? (
        <path
          className={s.icon}
          d={`M${ix} ${iy + 7} L${ix + 8} ${iy} L${ix + 16} ${iy + 7} V${iy + 16} H${ix} Z M${ix + 8} ${iy + 6} V${iy + 13} M${ix + 4.5} ${iy + 9.5} H${ix + 11.5}`}
        />
      ) : (
        <path
          className={s.icon}
          d={`M${ix} ${iy + 2} H${ix + 16} V${iy + 16} H${ix} Z M${ix} ${iy + 6} H${ix + 16} M${ix + 4} ${iy} V${iy + 4} M${ix + 12} ${iy} V${iy + 4}`}
        />
      )}
      <text className={s.cardTitle} x={box.x + 40} y={box.y + box.h / 2 - 2}>
        {title}
      </text>
      <text className={s.cardStatus} x={box.x + 40} y={box.y + box.h / 2 + 14}>
        {status}
      </text>
    </g>
  );
}
