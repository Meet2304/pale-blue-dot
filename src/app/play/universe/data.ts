import { oklch } from "../systems/current/color";
import type { BodyId } from "./bodies";

/**
 * Every unit of Meet's life as a body in one universe.
 *
 * Encoding, all of it deliberate:
 *   - the kind of body is the kind of work (see KINDS);
 *   - size and brightness are impact, on a 1 to 3 scale;
 *   - distance from Earth is time: the most recent work is closest;
 *   - each body sends a line of light back to Earth, weighted by impact.
 *
 * Facts come from the resume and GitHub. Impact scores and the archive
 * projects' years are PROPOSED and marked; Meet should set them.
 */

export type Kind = "experience" | "research" | "projects" | "leadership" | "education";

export const KINDS: Record<
  Kind,
  {
    label: string;
    body: BodyId;
    bodyName: string;
    mark: string;
    hue: number;
    l: number;
    c: number;
  }
> = {
  experience: {
    label: "Experience",
    body: "sun",
    bodyName: "star",
    mark: "=",
    hue: 70,
    l: 0.84,
    c: 0.13,
  },
  research: {
    label: "Research",
    body: "nebula",
    bodyName: "nebula",
    mark: "×",
    hue: 185,
    l: 0.8,
    c: 0.12,
  },
  projects: {
    label: "Projects",
    body: "planet",
    bodyName: "planet",
    mark: "+",
    hue: 300,
    l: 0.77,
    c: 0.14,
  },
  leadership: {
    label: "Leadership",
    body: "constellation",
    bodyName: "constellation",
    mark: "~",
    hue: 15,
    l: 0.77,
    c: 0.13,
  },
  education: {
    label: "Education",
    body: "blackhole",
    bodyName: "black hole",
    mark: "o",
    hue: 225,
    l: 0.86,
    c: 0.06,
  },
};

export const KIND_ORDER: Kind[] = [
  "experience",
  "research",
  "projects",
  "leadership",
  "education",
];

/** The seven colours a body draws with: five-stop ramp, warm, white. */
export function colorsOf(hue: number, l: number, c: number) {
  return [
    oklch(0.34, c * 0.35, hue),
    oklch(0.55, c * 0.75, hue),
    oklch(l, c, hue),
    oklch(0.9, c * 0.45, hue),
    oklch(0.97, 0.012, hue),
    "#ffd08a",
    "#ffffff",
  ];
}

export const EARTH_COLORS = colorsOf(245, 0.82, 0.09);

export type Unit = {
  id: string;
  name: string;
  kind: Kind;
  when: string;
  /** 1 to 3. PROPOSED for every unit; Meet to confirm. */
  impact: number;
  line: string;
  owned: string;
  result: string;
  link?: { label: string; href: string };
};

export type Collection = {
  id: string;
  title: string;
  span: string;
  note: string;
  units: Unit[];
};

export const COLLECTIONS: Collection[] = [
  {
    id: "now",
    title: "Now",
    span: "2026 to 2027",
    note: "Graduate school, a lab inside Bosch, and the tool I use every day.",
    units: [
      {
        id: "cmu",
        name: "Carnegie Mellon University",
        kind: "education",
        when: "2026 to 2027",
        impact: 3,
        line: "MS in AI Engineering and Technology Innovation Management.",
        owned: "J N Tata Scholar.",
        result: "In progress, Pittsburgh.",
      },
      {
        id: "bosch",
        name: "Corporate Startup Lab, Bosch Mobility",
        kind: "experience",
        when: "Aug to Dec 2026",
        impact: 2,
        line: "New segments for Bosch Mobility's low-voltage actuators.",
        owned:
          "Market research, customer discovery and strategic fit, in a team of six.",
        result: "In progress.",
      },
      {
        id: "linea",
        name: "Linea",
        kind: "projects",
        when: "2026",
        impact: 2.8,
        line: "Lyrics that float over your work, synced to whatever is playing.",
        owned:
          "The whole app: overlay, Windows media sessions, lyric sync, offline cache.",
        result: "Open source, version 0.2.0.",
        link: { label: "linea.meetbhatt.com", href: "https://linea.meetbhatt.com" },
      },
      {
        id: "converge",
        name: "Converge",
        kind: "projects",
        when: "2026",
        impact: 1.2,
        line: "Hackathon teams without the Discord cold messages.",
        owned: "Product definition and the build.",
        result: "In development.",
        link: {
          label: "converge.meetbhatt.com",
          href: "https://converge.meetbhatt.com",
        },
      },
    ],
  },
  {
    id: "2025",
    title: "2025",
    span: "2025",
    note: "Two research projects and a shoe that reads your heart.",
    units: [
      {
        id: "phoenix",
        name: "Project Phoenix",
        kind: "research",
        when: "2025 to 2026",
        impact: 3,
        line: "Catch the earliest cell changes in cervical cancer, and show why the model decided.",
        owned:
          "Image cleanup on SipakMed and Herlev, the CNN models, the visual explanations.",
        result: "Manuscript in preparation. Runs live in the browser.",
        link: { label: "phoenix.meetbhatt.com", href: "https://phoenix.meetbhatt.com" },
      },
      {
        id: "vigil",
        name: "Malicious prompt classifier",
        kind: "research",
        when: "2025",
        impact: 2.3,
        line: "Stop harmful prompts before they reach a language model, and say why.",
        owned: "A Markov-chain detector and a module that explains high-risk patterns.",
        result: "90.79% accuracy, 98.84% precision. Paper submitted.",
      },
      {
        id: "talaria",
        name: "Project Talaria",
        kind: "projects",
        when: "2025",
        impact: 2.4,
        line: "A shoe that tracks heart rate and gait, and forecasts both.",
        owned:
          "The ESP32 wearable, the cloud pipeline, and an RNN forecasting 50 steps ahead.",
        result: "R² of 0.97 across 15 signals, on 50,000+ sequences.",
        link: { label: "talaria.meetbhatt.com", href: "https://talaria.meetbhatt.com" },
      },
    ],
  },
  {
    id: "2024",
    title: "2024",
    span: "2024",
    note: "From annotating data to leading product, and a drone that flies on my own controller.",
    units: [
      {
        id: "blink",
        name: "Blink Analytics",
        kind: "experience",
        when: "2024 to 2026",
        impact: 3,
        line: "RLHF contributor, then team lead, then lead of product development.",
        owned:
          "Led development of Serin, an AI hiring platform; directed an intern team.",
        result: "222% more project revenue in two months.",
      },
      {
        id: "icarus",
        name: "Project Icarus",
        kind: "projects",
        when: "2024 to 2026",
        impact: 2,
        line: "A drone that flies on a flight controller I built.",
        owned: "Teensy 4.0 controller, custom PCB, sensor fusion in C.",
        result: "Stable flight.",
      },
    ],
  },
  {
    id: "2022",
    title: "2022 to 2023",
    span: "2022 to 2023",
    note: "An undergraduate degree, a quizzing club, and a path I turned down.",
    units: [
      {
        id: "pdeu",
        name: "Pandit Deendayal Energy University",
        kind: "education",
        when: "2022 to 2026",
        impact: 2.4,
        line: "B.Tech in Computer Engineering, minor in IoT.",
        owned: "GPA 9.55 out of 10.",
        result: "Graduated June 2026.",
      },
      {
        id: "mindripple",
        name: "Mind Ripple",
        kind: "leadership",
        when: "2022 to 2026",
        impact: 2.6,
        line: "The university's quizzing club: member, head of design, president, advisor.",
        owned: "Led a 30-member team.",
        result: "Matrix Breakout grew to 300+ participants, earnings up 10% a year.",
      },
      {
        id: "astar",
        name: "Astar Technologies",
        kind: "experience",
        when: "Dec 2023 to Jan 2024",
        impact: 1.5,
        line: "Which sweets sell where, and when.",
        owned: "Cleaned the sales data; forecast regional and seasonal demand.",
        result: "Then turned down the ready-made path it offered.",
      },
    ],
  },
  {
    id: "2021",
    title: "2021",
    span: "2021 to 2022",
    note: "The oldest light here: a club I started.",
    units: [
      {
        id: "interact",
        name: "Interact Club of Baroda Sayajinagari",
        kind: "leadership",
        when: "2021 to 2022",
        impact: 2.1,
        line: "Founded it, and served as its charter president.",
        owned: "Led 32 teenagers in service projects with nonprofits.",
        result: "Work with the Pratibha Foundation, among others.",
      },
    ],
  },
];

/* ---------------------------------------------------------------- Layout */

export type Placed = Unit & {
  x: number;
  y: number;
  /** Body radius in world units; Earth's is 1. */
  r: number;
  seed: number;
  collection: number;
};

export type Group = { x: number; y: number; r: number };

/** Collections sit on a spiral out from Earth, one turn of time. */
export function layout() {
  const placed: Placed[] = [];
  const groups: Group[] = [];
  COLLECTIONS.forEach((col, ci) => {
    const ang = -0.75 + ci * 1.3;
    const dist = 14 + ci * 12;
    const gx = Math.cos(ang) * dist;
    const gy = Math.sin(ang) * dist * 0.72;
    let reach = 0;
    const n = col.units.length;
    col.units.forEach((u, ui) => {
      const r = 0.55 + u.impact * 0.42;
      const a = ang + Math.PI / 2 + (ui / Math.max(1, n)) * Math.PI * 2;
      const off = n === 1 ? 0 : 3.4 + r * 0.9;
      const x = gx + Math.cos(a) * off;
      const y = gy + Math.sin(a) * off;
      placed.push({ ...u, x, y, r, seed: (ci * 7 + ui + 1) * 0.137, collection: ci });
      reach = Math.max(reach, Math.hypot(x - gx, y - gy) + r * 2);
    });
    groups.push({ x: gx, y: gy, r: reach });
  });
  return { placed, groups };
}
