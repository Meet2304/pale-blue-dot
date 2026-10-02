/**
 * Every unit of Meet's life, grouped into the chapters the home page flies
 * through, newest first. The universe, the menus and the per-unit pages at
 * `/work/[slug]` all read from here, so a fact is written once.
 *
 * Facts come from the resume (September 2026) and GitHub. Still placeholders,
 * to be settled with Meet once the design is ready:
 *   - every `impact` score (1 to 3), and what "impact" should mean;
 *   - the missing numbers (Phoenix accuracy, Linea users, Icarus results).
 */

export type Kind = "experience" | "research" | "projects" | "leadership" | "education";

/**
 * A picture of the work, shown beside it on the home page: a photo, or a
 * website, shown as a few of its screens in a browser frame, turning from
 * one to the next as if someone were scrolling it, and loading the live site
 * in its place on request.
 *
 * Every picture is a plain file in `public/work/<piece>/`, WebP, in two
 * sizes: the file itself, and a half-size copy beside it named `-sm.webp`
 * for small screens. They are served as they are, with no resizing on the
 * way, so nothing stands between a visitor and the picture. Screens of a
 * website are 1280 × 800, captured from the live site.
 */
export type Media =
  | {
      kind: "photo";
      /** In `public`, from the site's root. */
      src: string;
      width: number;
      height: number;
      alt: string;
      caption?: string;
      /** A logo is shown smaller than a photo: it names, it doesn't show. */
      logo?: boolean;
    }
  | {
      kind: "site";
      href: string;
      /** The address shown in the frame's bar. */
      label: string;
      /** False for a site that refuses to be shown inside another page
          (X-Frame-Options): "Try it live" then opens it in a new tab. */
      embed?: boolean;
      /** 1280 × 800 each, in `public`, from the site's root. */
      screens: { src: string; alt: string }[];
    };

export type Unit = {
  /** Also the per-unit page's slug: `/work/${id}`. */
  id: string;
  name: string;
  kind: Kind;
  when: string;
  /** 1 to 3. Sets brightness on the map and size up close. PLACEHOLDER. */
  impact: number;
  line: string;
  /**
   * What the opportunity was about, for someone reading Meet's resume: the
   * aim, or the role and its scope, rather than test numbers. Shown in the
   * bar's panels.
   */
  brief: string;
  owned: string;
  result: string;
  /** Where the thing itself is. Shown as "Visit <label>", or with `verb`
      in place of "Visit" ("Read the paper"). */
  link?: { label: string; href: string; verb?: string };
  media?: Media;
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
        brief:
          "Pursuing a Master of Science in Artificial Intelligence Engineering – Engineering and Technology Innovation Management, as a J N Tata Scholar.",
        kind: "education",
        when: "2026 to 2027",
        impact: 3,
        line: "Master of Science in Artificial Intelligence Engineering – Engineering and Technology Innovation Management.",
        owned: "J N Tata Scholar.",
        result: "In progress, Pittsburgh.",
        media: {
          kind: "photo",
          src: "/work/carnegie-mellon/campus.webp",
          width: 1600,
          height: 800,
          alt: "Carnegie Mellon's campus at sunset, with the Walking to the Sky sculpture.",
          caption: "Carnegie Mellon, Pittsburgh",
        },
      },
      {
        id: "bosch-mobility",
        name: "Corporate Startup Lab, Bosch Mobility",
        brief:
          "Finding new markets for Bosch's low-voltage actuators, in a team of six: market research, customer discovery and strategic fit.",
        kind: "experience",
        when: "Aug to Dec 2026",
        impact: 2,
        line: "New segments for Bosch Mobility's low-voltage actuators.",
        owned:
          "Market research, customer discovery and strategic fit, in a team of six.",
        result: "In progress.",
        media: {
          kind: "photo",
          src: "/work/bosch-mobility/csl.webp",
          width: 960,
          height: 720,
          alt: "The Corporate Startup Lab's logo: CSL in white on red.",
          logo: true,
          caption: "Corporate Startup Lab, Bosch Mobility",
        },
      },
      {
        id: "linea",
        name: "Linea",
        brief:
          "An open-source Windows app I designed and built end to end: lyrics that float over your work, in time with whatever is playing.",
        kind: "projects",
        when: "2026",
        impact: 2.8,
        line: "Lyrics that float over your work, synced to whatever is playing.",
        owned:
          "The whole app: overlay, Windows media sessions, lyric sync, offline cache.",
        result: "Open source, version 0.2.0.",
        link: { label: "linea.meetbhatt.com", href: "https://linea.meetbhatt.com" },
        media: {
          kind: "site",
          href: "https://linea.meetbhatt.com",
          label: "linea.meetbhatt.com",
          screens: [
            {
              src: "/work/linea/1-hero.webp",
              alt: "Linea's home page: 'Know every word.', over a lyric card.",
            },
            {
              src: "/work/linea/2-lyrics.webp",
              alt: "Live lyrics: the current line stays centred as the song plays.",
            },
            {
              src: "/work/linea/3-looks.webp",
              alt: "The overlay's dark look, with its settings for theme and size.",
            },
            {
              src: "/work/linea/4-sound.webp",
              alt: "'Sound has a shape': a Chladni figure computed live on the page.",
            },
            {
              src: "/work/linea/5-end.webp",
              alt: "The end of the page, with the Linea wordmark.",
            },
          ],
        },
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
        brief:
          "Aim: help catch the earliest cell changes in cervical cancer, with a model that shows why it decided, running in the browser.",
        kind: "research",
        when: "2025 to 2026",
        impact: 3,
        line: "Catch the earliest cell changes in cervical cancer, and show why the model decided.",
        owned:
          "Image cleanup on SipakMed and Herlev, the CNN models, the visual explanations.",
        result: "Manuscript in preparation. Runs live in the browser.",
        link: { label: "phoenix.meetbhatt.com", href: "https://phoenix.meetbhatt.com" },
        media: {
          kind: "site",
          href: "https://phoenix.meetbhatt.com",
          label: "phoenix.meetbhatt.com",
          screens: [
            {
              src: "/work/phoenix/1-title.webp",
              alt: "Phoenix: explainable cervical cancer cell classification.",
            },
            {
              src: "/work/phoenix/2-ability.webp",
              alt: "'We're giving AI the ability to truly understand cervical cancer cells.'",
            },
            {
              src: "/work/phoenix/3-diagnosis.webp",
              alt: "'So diagnosis becomes clearer, safer, and impossible to misinterpret.'",
            },
            {
              src: "/work/phoenix/4-cells.webp",
              alt: "The five cell types the model tells apart.",
            },
            {
              src: "/work/phoenix/5-github.webp",
              alt: "Open source: join the project on GitHub.",
            },
          ],
        },
      },
      {
        id: "prompt-classifier",
        name: "Malicious prompt classifier",
        brief:
          "Aim: stop harmful prompts before they reach a language model, and explain which patterns made them look risky.",
        kind: "research",
        when: "2025",
        impact: 2.3,
        line: "Stop harmful prompts before they reach a language model, and say why.",
        owned: "A Markov-chain detector and a module that explains high-risk patterns.",
        result:
          "90.79% accuracy, 98.84% precision. Published in Procedia Computer Science, 2026.",
        link: {
          verb: "Read",
          label: "the paper",
          href: "https://www.sciencedirect.com/science/article/pii/S1877050926016996",
        },
      },
      {
        id: "talaria",
        name: "Project Talaria",
        brief:
          "A smart shoe for everyday health: a wearable that tracks heart rate and gait, and a model that forecasts both ahead of time.",
        kind: "projects",
        when: "2025",
        impact: 2.4,
        line: "A shoe that tracks heart rate and gait, and forecasts both.",
        owned:
          "The ESP32 wearable, the cloud pipeline, and an RNN forecasting 50 steps ahead.",
        result: "R² of 0.97 across 15 signals, on 50,000+ sequences.",
        link: { label: "talaria.meetbhatt.com", href: "https://talaria.meetbhatt.com" },
        media: {
          kind: "site",
          href: "https://talaria.meetbhatt.com",
          label: "talaria.meetbhatt.com",
          embed: false,
          screens: [
            {
              src: "/work/talaria/1-title.webp",
              alt: "Talaria: heart and gait, monitored in real time.",
            },
            {
              src: "/work/talaria/2-legend.webp",
              alt: "The legend: the winged sandals of Hermes.",
            },
            {
              src: "/work/talaria/3-features.webp",
              alt: "Heart rate and blood oxygen, tracked continuously.",
            },
            {
              src: "/work/talaria/4-gait.webp",
              alt: "Gait analysis, and live charts of every stride.",
            },
            {
              src: "/work/talaria/5-join.webp",
              alt: "Open source: join the project on GitHub.",
            },
          ],
        },
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
        brief:
          "Grew from RLHF contributor to team lead to leading product development; led the build of Serin, an AI interview and hiring platform.",
        kind: "experience",
        when: "2024 to 2026",
        impact: 3,
        line: "RLHF contributor, then team lead, then lead of product development.",
        owned:
          "Led development of Serin, an AI hiring platform; directed an intern team.",
        result: "222% more project revenue in two months.",
        link: { label: "blinkanalytics.in", href: "https://www.blinkanalytics.in" },
        media: {
          kind: "site",
          href: "https://www.blinkanalytics.in",
          label: "blinkanalytics.in",
          screens: [
            {
              src: "/work/blink-analytics/1-intelligence.webp",
              alt: "Blink Analytics: data into intelligence, models into impact.",
            },
            {
              src: "/work/blink-analytics/2-what.webp",
              alt: "What Blink does: generative AI and data analytics.",
            },
            {
              src: "/work/blink-analytics/3-services.webp",
              alt: "Services, from RLHF to retrieval-augmented generation.",
            },
            {
              src: "/work/blink-analytics/4-leverage.webp",
              alt: "'Leverage AI and data to propel your business.'",
            },
            {
              src: "/work/blink-analytics/5-end.webp",
              alt: "The end of the page, with the Blink Analytics wordmark.",
            },
          ],
        },
      },
      {
        id: "icarus",
        name: "Project Icarus",
        brief:
          "A drone that flies on a flight controller I designed and built myself: custom PCB, Teensy 4.0, sensor fusion in C.",
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
        brief:
          "B.Tech in Computer Engineering with a minor in IoT, graduating with a 9.55 out of 10 GPA.",
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
        brief:
          "The university's quizzing club: rose from member to head of design to president, leading a 30-member team and its flagship event.",
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
        brief:
          "Lead business and data analysis intern: forecasting which products sell where and when, to guide production and marketing.",
        kind: "experience",
        when: "Dec 2023 to Jan 2024",
        impact: 1.5,
        line: "Which sweets sell where, and when.",
        owned:
          "Cleaned the sales data; forecast regional and seasonal demand with time series, Random Forest and XGBoost.",
        result: "Top sellers by region and season, to guide production and marketing.",
        link: { label: "astartechnologies.net", href: "https://astartechnologies.net" },
        media: {
          kind: "site",
          href: "https://astartechnologies.net",
          label: "astartechnologies.net",
          screens: [
            {
              src: "/work/astar/1-home.webp",
              alt: "Astar Technologies: software development, Vadodara.",
            },
            {
              src: "/work/astar/2-offers.webp",
              alt: "What Astar offers: software, web and mobile apps.",
            },
            {
              src: "/work/astar/3-solutions.webp",
              alt: "Its smart solutions, from ERP to point of sale.",
            },
            {
              src: "/work/astar/4-cases.webp",
              alt: "Case studies, starting with e-commerce.",
            },
            {
              src: "/work/astar/5-mobile.webp",
              alt: "A mobile app for sales and marketing.",
            },
          ],
        },
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
        brief:
          "Founded the club and served as its charter president, leading 32 teenagers in service projects with nonprofits.",
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
