/**
 * Every unit of Meet's life, grouped into the chapters the home page flies
 * through, newest first. The universe, its index table and the per-unit pages
 * at `/work/[slug]` all read from here, so a fact is written once.
 *
 * Facts come from the resume (September 2026) and GitHub. Still placeholders,
 * to be settled with Meet once the design is ready:
 *   - every `impact` score (1 to 3), and what "impact" should mean;
 *   - the missing numbers (Phoenix accuracy, Linea users, Icarus results).
 */

export type Kind = "experience" | "research" | "projects" | "leadership" | "education";

export type Unit = {
  /** Also the per-unit page's slug: `/work/${id}`. */
  id: string;
  name: string;
  kind: Kind;
  when: string;
  /** 1 to 3. Sets brightness on the map and size up close. PLACEHOLDER. */
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
  /** The short label for the chapter index and the map. */
  tick: string;
  note: string;
  units: Unit[];
};

export const COLLECTIONS: Collection[] = [
  {
    id: "now",
    title: "Now",
    span: "2026 to 2027",
    tick: "now",
    note: "Graduate school, a lab inside Bosch, and the tool I use every day.",
    units: [
      {
        id: "carnegie-mellon",
        name: "Carnegie Mellon University",
        kind: "education",
        when: "2026 to 2027",
        impact: 3,
        line: "MS in AI Engineering and Technology Innovation Management.",
        owned: "J N Tata Scholar.",
        result: "In progress, Pittsburgh.",
      },
      {
        id: "bosch-mobility",
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
    ],
  },
  {
    id: "2025",
    title: "2025",
    span: "2025",
    tick: "2025",
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
        id: "prompt-classifier",
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
    tick: "2024",
    note: "From annotating data to leading product, and a drone that flies on my own controller.",
    units: [
      {
        id: "blink-analytics",
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
    tick: "2022",
    note: "An undergraduate degree, a quizzing club, and a first real forecast.",
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
        id: "mind-ripple",
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
        owned:
          "Cleaned the sales data; forecast regional and seasonal demand with time series, Random Forest and XGBoost.",
        result: "Top sellers by region and season, to guide production and marketing.",
      },
    ],
  },
  {
    id: "2021",
    title: "2021",
    span: "2021 to 2022",
    tick: "2021",
    note: "The oldest light here: a club I started.",
    units: [
      {
        id: "interact-club",
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

export const UNITS: Unit[] = COLLECTIONS.flatMap((c) => c.units);

export const unitById = (id: string) => UNITS.find((u) => u.id === id);

/** Where Meet can be reached, used by the home page's closing chapter. */
export const CONTACT = {
  email: "mbbhatt@andrew.cmu.edu",
  github: "https://github.com/Meet2304",
  linkedin: "https://www.linkedin.com/in/meet-bhatt2304/",
  resume:
    "https://drive.google.com/drive/folders/14uk3ov5w5_K6YqAQykGxUtV5fPBPrxoo?usp=sharing",
} as const;
