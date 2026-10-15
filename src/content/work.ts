/**
 * Every unit of Meet's life, grouped into the chapters the home page flies
 * through, newest first. The universe, the menus and the per-unit pages at
 * `/work/[slug]` all read from here, so a fact is written once.
 *
 * Written for a recruiter with a minute to spare: what Meet did, what it
 * took, and what came of it. Facts come from the resume (October 2026) and
 * GitHub, and nothing here goes beyond them. Still to settle with Meet:
 *   - every `impact` score (1 to 3), and what "impact" should mean;
 *   - the missing numbers (Phoenix accuracy, Linea users, Icarus results,
 *     Serin's interviews, Astar's forecast accuracy);
 *   - the skills named for Serin and Carnegie Mellon, inferred from the
 *     resume's skills list rather than stated beside them.
 */

export type Kind =
  "experience" | "research" | "projects" | "leadership" | "education" | "awards";

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
    }
  | {
      /**
       * A photograph rebuilt as a 3D Gaussian splat (splat.ts) by Apple's
       * SHARP, packed as .spz: the photograph (also what shows while it
       * loads, and where it can't run), the splat, the camera's vertical
       * field of view and the distance to the subject, both from SHARP.
       */
      kind: "splat";
      color: string;
      src: string;
      fov: number;
      focus: number;
      /**
       * For the bar's panel: the camera turned from left to right round the
       * subject, in frames laid out 5 across on one sheet, which the pointer
       * steps through as it crosses the picture.
       */
      turn?: string;
      width: number;
      height: number;
      alt: string;
      caption?: string;
    }
  | {
      /**
       * The work drawn as a machine, an interactive figure built outside the
       * site (pale-blue-dot-figures) and served whole from `public/figures/`,
       * shown in a frame of its own so none of it weighs on the page until
       * it is near.
       */
      kind: "figure";
      src: string;
      title: string;
      caption?: string;
    };

/** What a piece of work shows in the bar's panel when pointed at. */
export type Peek = {
  /** Shown at once, and what a clip starts from. */
  still: string;
  /** A short loop, played only while shown. */
  clip?: string;
  /** A site's screens (half size), stepped through while shown. */
  screens?: string[];
  /** A splat's turn: its sheet of frames, 5 across, the middle one `still`. */
  turn?: { src: string; frames: number };
  /** Width over height, kept whole: never cropped. */
  aspect: number;
};

/**
 * The panel's picture of a piece of work: a photo; a site's screens; a
 * splat's still and its turn, moved only by the pointer; or a figure's still and loop, both
 * recorded from the figure itself (public/figures/<id>.webp and .mp4).
 */
export function peekOf(media: Media): Peek {
  const sm = (src: string) => src.replace(/\.webp$/, "-sm.webp");
  switch (media.kind) {
    case "photo":
      return { still: sm(media.src), aspect: media.width / media.height };
    case "site":
      return {
        still: sm(media.screens[0].src),
        screens: media.screens.map((sc) => sm(sc.src)),
        aspect: 1280 / 800,
      };
    case "splat":
      return {
        still: media.turn
          ? media.turn.replace(/-turn\.webp$/, "-rest.webp")
          : media.color,
        turn: media.turn ? { src: media.turn, frames: 25 } : undefined,
        aspect: media.width / media.height,
      };
    case "figure":
      return {
        still: media.src.replace(/\.html$/, ".webp"),
        clip: media.src.replace(/\.html$/, ".mp4"),
        aspect: 640 / 430,
      };
  }
}

/** A piece of work's picture in the bar's panel: its own, or its media's. */
export function peekOfUnit(u: {
  media?: Media;
  peek?: { src: string; width: number; height: number };
}): Peek | null {
  if (u.peek) return { still: u.peek.src, aspect: u.peek.width / u.peek.height };
  return u.media ? peekOf(u.media) : null;
}

/** The pictures that open in the lightbox: a photo or a site's screens. */
export type FramedMedia = Extract<Media, { kind: "photo" | "site" }>;

/** A number that shows the impact, and what it counts. */
export type Stat = { value: string; label: string };

/** A place on Earth: longitude, latitude, in degrees. */
export type LonLat = [number, number];

/**
 * An award's own page (award.tsx), told in the order anyone would ask:
 * what was won and where it was announced; how it works, shown more than
 * told; my part in it; and the days it happened over. All of it lives here,
 * with the award, so the page, the home page and the bar read the same
 * facts.
 */
export type AwardStory = {
  /** The page's title, and a short paragraph under it. */
  title: string;
  intro: string;
  /** Each win, the latest first: who gave it, for what, when, a line on it,
      and its announcement (its image, and the post on each platform). */
  wins: {
    by: string;
    title: string;
    event: string;
    date: string;
    line: string;
    links: { platform: "linkedin" | "x"; href: string }[];
    image: { src: string; width: number; height: number; alt: string };
  }[];
  /** The work that won them. */
  project: { name: string; href: string; repo?: string };
  /** How it works, said briefly: a line on the problem it answers, the
      steps of a call as the page's animation tells them (call-flow.tsx),
      and a few points to take away. */
  how: { line: string; steps: string[]; points: string[] };
  /** My part: my role on the team, what I built, and who with. */
  role: { title: string; built: string[]; with: string };
  /** The days, in order. A stop's `at` (ISO, with its offset) says when it
      happened, or will; with a `flight`, the page draws them on a globe
      (journey.tsx), and a stop with a place is pinned on it. */
  days: {
    stops: {
      at: string;
      when: string;
      place: string;
      title: string;
      line: string;
      ll?: LonLat;
    }[];
    /** The trip, airport by airport, with the hour it leaves the first and
        reaches the last (ISO, with offsets). */
    flight?: { stops: { code: string; ll: LonLat }[]; leaves: string; lands: string };
  };
  /** A picture for the end of the page, and a frame kept for one still to
      be taken, until its date (`until`, ISO). */
  photo?: { src: string; width: number; height: number; alt: string; caption: string };
  soon?: { label: string; until: string };
};

/**
 * The latest news, for the hero, the sky behind Earth and the bar: which
 * piece it is, what to say before and after a moment (`turn`, ISO), and
 * the day it stops being news.
 */
export type News = {
  id: string;
  before: string;
  after: string;
  turn: string;
  until: string;
};

export type Unit = {
  /** Also the per-unit page's slug: `/work/${id}`. */
  id: string;
  name: string;
  kind: Kind;
  when: string;
  /** Meet's title there, or the steps of it, joined by " → ". */
  role?: string;
  /** 1 to 3. Sets brightness on the map and size up close. PLACEHOLDER. */
  impact: number;
  /** What it is, in one line: the page's lede and its description. */
  line: string;
  /**
   * What Meet did there, for the home page and the bar's panels: a sentence
   * or two in the form a resume uses (accomplished X, as measured by Y, by
   * doing Z), with the number in it wherever there is one.
   */
  brief: string;
  /** What it took, the most telling first. Five at most. */
  skills: string[];
  /** Why the work existed, in plain words, for its own page. */
  aim: string;
  /** What Meet did, a line each, for its own page. */
  did: string[];
  /** The numbers at the top of its page, where there are any. */
  stats?: Stat[];
  /** What came of it, in a line. */
  result: string;
  /** Where the thing itself is. Shown as "Visit <label>", or with `verb`
      in place of "Visit" ("Read the paper"). */
  link?: { label: string; href: string; verb?: string };
  /** Its code, where it is public. */
  repo?: string;
  media?: Media;
  /** Part of another piece of work (its id): drawn as that piece's body,
      seen again from another side, rather than as a body of its own. */
  sameAs?: string;
  /** For an award: everything its own page tells. */
  story?: AwardStory;
  /** The bar's picture, where it isn't the home page's (an award shows
      its announcement): one still, served as it is. */
  peek?: { src: string; width: number; height: number };
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
    note: "A hackathon double, graduate school, a research lab, a project with Bosch, and the tool I use every day.",
    units: [
      {
        id: "hackathon-wins",
        name: "Hack-Nation & World Bank Group Hackathon",
        kind: "awards",
        when: "Oct 2026",
        role: "Grand winner, Hack-Nation · Winner, World Bank Health track",
        impact: 3,
        line: "Grand winner of Hack-Nation's 7th Global AI Hackathon, and winner of the World Bank Group's Small AI for Development Health track, with Vitamin Bob.",
        brief:
          "Vitamin Bob won the World Bank Group's Small AI for Development Health track, then Hack-Nation's 7th Global AI Hackathon outright, out of 3,000+ builders. It turns a missed call into the first step of primary care. I built its AI and backend, and I'm presenting it at the World Bank's summit in Seoul.",
        skills: ["On-device LLMs", "Backend", "Product engineering", "AI for health"],
        aim: "4.6 billion people still lack essential health care, and in rural areas patients arrive before their story does. Vitamin Bob turns a missed call into the first step of primary care: one computer in every district calls patients back, free and in their own language, with no app and no internet.",
        did: [
          "Built Bob's AI and backend: the call, the on-device model and the routing to care.",
          "Made it safe: the AI only fills a form, and anything it can't back is asked again.",
          "Built the phone gateway, the live dashboard and the website.",
        ],
        stats: [
          { value: "1st", label: "of 3,000+ builders, Hack-Nation" },
          { value: "1st", label: "Health track, World Bank Group" },
          { value: "21 Oct", label: "a talk in Seoul" },
        ],
        result:
          "Grand winner of Hack-Nation, winner of the World Bank's Health track, and a talk in Seoul.",
        link: {
          label: "the announcement",
          href: "https://www.linkedin.com/posts/hack-nation_hacknation-globalaihackathon-buildinpublic-activity-7515871527326699520-EMsF",
          verb: "Read",
        },
        repo: "https://github.com/Meet2304/vitamin-bob",
        peek: { src: "/work/hackathon-wins/both.webp", width: 1212, height: 600 },
        media: {
          kind: "photo",
          src: "/work/vitamin-bob/team.webp",
          width: 1600,
          height: 1200,
          alt: "Yusril, Rizaldy, Egshiglen and Meet, smiling, in a glass atrium at Carnegie Mellon.",
          caption: "Yusril, Rizaldy, Egshiglen and me, at Carnegie Mellon.",
        },
        story: {
          title: "Two wins for Vitamin Bob",
          intro:
            "In October, four of us at Carnegie Mellon built Vitamin Bob in 24 hours. It won the World Bank Group's Health track, then the whole of Hack-Nation's global hackathon. Next, I'm presenting it at the World Bank's summit in Seoul.",
          wins: [
            {
              by: "Hack-Nation",
              title: "Grand winner",
              event: "7th Global AI Hackathon",
              date: "14 Oct 2026",
              line: "First overall, out of 3,000+ builders and five challenges, after a live final.",
              links: [
                {
                  platform: "linkedin",
                  href: "https://www.linkedin.com/posts/hack-nation_hacknation-globalaihackathon-buildinpublic-activity-7515871527326699520-EMsF",
                },
                {
                  platform: "x",
                  href: "https://x.com/Hack_Nation_AI/status/2110767894032470385",
                },
              ],
              image: {
                src: "/work/hackathon-wins/hack-nation.webp",
                width: 720,
                height: 720,
                alt: "Hack-Nation's card: Grand Winner, Overall Outstanding, Vitamin Bob, with the four of the team.",
              },
            },
            {
              by: "World Bank Group",
              title: "Winner, Health track",
              event: "Small AI for Development",
              date: "6 Oct 2026",
              line: "Small AI for basic phones and local languages, judged across 150+ countries. The prize: a talk in Seoul.",
              links: [
                {
                  platform: "linkedin",
                  href: "https://www.linkedin.com/feed/update/urn:li:ugcPost:7516077076857389056/",
                },
              ],
              image: {
                src: "/work/hackathon-wins/world-bank.webp",
                width: 705,
                height: 702,
                alt: "The World Bank Group's card: Meet the Small AI for Development Hackathon Winners, Health Track, Vitamin Bob.",
              },
            },
          ],
          project: {
            name: "Vitamin Bob",
            href: "https://vitamin-bob.vercel.app",
            repo: "https://github.com/Meet2304/vitamin-bob",
          },
          how: {
            line: "4.6 billion people still can't get basic health care. In villages, patients travel far and wait, and the clinic hears their story only when they arrive. Vitamin Bob starts care with a phone call instead.",
            steps: [
              "Kevin rings once and hangs up. It costs him nothing.",
              "The district computer finds a free phone line.",
              "It calls Kevin back, in Hindi.",
              "Kevin answers a few questions on his keypad.",
              "The computer decides how urgent it is.",
              "Emergency? The nearest clinic is alerted at once.",
              "Not urgent? An appointment is booked instead.",
              "Free for patients. In their language. No internet.",
            ],
            points: [
              "Works on any phone, with no app and no internet.",
              "Free for the patient, in Hindi or Gujarati.",
              "The AI prepares the visit. A clinician makes the decision.",
            ],
          },
          role: {
            title: "AI & Backend · LLM & Product Engineer",
            built: [
              "Bob's AI and backend: the call, the on-device model (Gemma 4) and the routing to care.",
              "The safety net: the AI only fills a form, and anything it can't back up is asked again.",
              "The phone gateway, the live dashboard and the website.",
            ],
            with: "With Egshiglen Batjargal, Rizaldy Al Kautsar Utomo and Yusril Hana.",
          },
          days: {
            stops: [
              {
                at: "2026-10-03T09:00:00-04:00",
                when: "3 Oct",
                place: "Pittsburgh",
                title: "24 hours start",
                line: "Four of us and one laptop.",
                ll: [-79.94, 40.44],
              },
              {
                at: "2026-10-06T12:01:00-04:00",
                when: "6 Oct",
                place: "Pittsburgh",
                title: "World Bank: we won Health",
                line: "And an invitation to speak in Seoul.",
                ll: [-79.94, 40.44],
              },
              {
                at: "2026-10-14T20:00:00-04:00",
                when: "14 Oct",
                place: "Pittsburgh",
                title: "Hack-Nation: Grand winner",
                line: "We pitched live, and took the whole hackathon.",
                ll: [-79.94, 40.44],
              },
              {
                at: "2026-10-17T17:59:00-04:00",
                when: "17 Oct",
                place: "Pittsburgh → Seoul",
                title: "21 hours in the air",
                line: "Over the top of the world.",
              },
              {
                at: "2026-10-21T10:30:00+09:00",
                when: "21 Oct, 10:30",
                place: "Seoul",
                title: "On stage",
                line: "“Benefiting Billions: Scaling AI for Healthier Lives.”",
                ll: [126.99, 37.54],
              },
            ],
            flight: {
              stops: [
                { code: "PIT", ll: [-80.23, 40.49] },
                { code: "ATL", ll: [-84.43, 33.64] },
                { code: "ICN", ll: [126.45, 37.46] },
              ],
              leaves: "2026-10-17T17:59:00-04:00",
              lands: "2026-10-19T04:15:00+09:00",
            },
          },
          photo: {
            src: "/work/vitamin-bob/team.webp",
            width: 1600,
            height: 1200,
            alt: "Yusril, Rizaldy, Egshiglen and Meet, smiling, in a glass atrium at Carnegie Mellon.",
            caption: "Yusril, Rizaldy, Egshiglen and me, Carnegie Mellon, October 2026",
          },
          soon: { label: "Seoul, 19 to 22 Oct", until: "2026-10-23T00:00:00+09:00" },
        },
      },
      {
        id: "carnegie-mellon",
        name: "Carnegie Mellon University",
        kind: "education",
        when: "Aug 2026 to Dec 2027",
        role: "Master of Science, J N Tata Scholar",
        impact: 3,
        line: "Master of Science in Artificial Intelligence Engineering and Technology Innovation Management.",
        brief:
          "Studying for a Master of Science in Artificial Intelligence Engineering and Technology Innovation Management as a J N Tata Scholar, while doing research in a lab on campus and consulting for Bosch Mobility.",
        skills: ["AI engineering", "Machine learning", "Innovation management"],
        aim: "A degree in two halves: how to engineer AI systems that work, and how to turn new technology into products a business can take to market.",
        did: [
          "Awarded the J N Tata Scholarship for graduate study.",
          "Research assistant in the Health and Human Performance Lab, predicting who benefits from mindfulness training.",
          "Market research and customer discovery for Bosch Mobility, in the Corporate Startup Lab.",
        ],
        result: "In progress. Graduating December 2027.",
        media: {
          kind: "splat",
          color: "/work/carnegie-mellon/splat-color.webp",
          src: "/work/carnegie-mellon/splat.spz",
          turn: "/work/carnegie-mellon/splat-turn.webp",
          fov: 35.75,
          focus: 45,
          width: 1280,
          height: 640,
          alt: "Carnegie Mellon's campus at sunset, with the Walking to the Sky sculpture.",
          caption: "Carnegie Mellon, Pittsburgh. Drag to look around.",
        },
      },
      {
        id: "bosch-mobility",
        name: "Corporate Startup Lab, Bosch Mobility",
        kind: "experience",
        when: "Aug 2026 to Dec 2026",
        impact: 2,
        line: "New markets for Bosch Mobility's low-voltage actuators.",
        brief:
          "Finding where Bosch Mobility can grow its range of low-voltage actuators, through market research, customer discovery and strategic-fit analysis, in a team of six.",
        skills: ["Market research", "Customer discovery", "Strategic-fit analysis"],
        aim: "Bosch Mobility wants to grow its range of low-voltage actuators. Our team's job is to find out where they could go next, and which of those options really fit Bosch.",
        did: [
          "Researching the markets where Bosch's low-voltage actuators could grow.",
          "Interviewing potential customers to test which needs are real.",
          "Weighing each opportunity on its strategic fit with Bosch Mobility, in a team of six.",
        ],
        result: "In progress, through December 2026.",
        media: {
          kind: "figure",
          src: "/figures/bosch-mobility.html",
          title: "One actuator, new markets",
          caption: "Point at an application to send the actuator there.",
        },
      },
      {
        id: "linea",
        name: "Linea",
        kind: "projects",
        when: "Apr 2026 to present",
        role: "Designer and developer",
        impact: 2.8,
        line: "Lyrics that float over your work, synced to whatever is playing.",
        brief:
          "Designed and shipped Linea, an open-source desktop app now at version 0.2.0, that floats time-synced lyrics over your work, by building a transparent, click-through Electron overlay that follows whatever is playing.",
        skills: ["Electron", "TypeScript", "Desktop apps", "Product design"],
        aim: "Reading along to a song usually means switching to another window. Linea puts the lyrics on top of whatever you're doing instead, in time with the music, without getting in the way.",
        did: [
          "Built a transparent, always-on-top window that clicks through to whatever is beneath it.",
          "Connected it to Windows' media sessions, so the lyrics follow whatever is playing and stay in time.",
          "Kept everything on the device, with an offline cache and no account.",
          "Designed and built the whole app, and its website, end to end.",
        ],
        result: "Open source, version 0.2.0.",
        link: { label: "linea.meetbhatt.com", href: "https://linea.meetbhatt.com" },
        repo: "https://github.com/Meet2304/Project-Linea",
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
      {
        id: "health-performance-lab",
        name: "Health and Human Performance Lab",
        kind: "research",
        when: "Sep 2026 to Dec 2026",
        role: "Research Assistant, Carnegie Mellon University",
        impact: 2,
        line: "Who benefits from mindfulness training, and why.",
        brief:
          "Predicting who responds to mindfulness training, by applying interpretable, cross-validated models to longitudinal study data, and extending them to daily-life data to find the patterns linked to benefit.",
        skills: [
          "Interpretable machine learning",
          "Cross-validation",
          "Longitudinal data",
          "Research",
        ],
        aim: "Mindfulness training helps some people far more than others. The lab wants to know who, and which ways of practising make the difference.",
        did: [
          "Applying interpretable, cross-validated models to longitudinal data to predict who responds to mindfulness treatment.",
          "Extending the before-and-after models to data from daily life, to find the participant and practice patterns linked to benefit.",
          "Advised by Prof. Kirk Warren Brown and Prof. J. David Creswell.",
        ],
        result: "In progress, through December 2026.",
        media: {
          kind: "figure",
          src: "/figures/health-performance-lab.html",
          title: "Who benefits, and why",
          caption: "Move across it to scrub through the weeks.",
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
        kind: "research",
        when: "Jul 2025 to May 2026",
        impact: 3,
        line: "Catch the earliest cell changes in cervical cancer, and show why the model decided.",
        brief:
          "Built a cervical-cancer cell classifier a doctor can check, by cleaning up microscope images from SipakMed and Herlev and training convolutional neural networks that highlight the parts of each image behind their answer. It runs live in the browser; the paper is being written.",
        skills: [
          "Convolutional neural networks",
          "Explainable AI",
          "Medical imaging",
          "Python",
        ],
        aim: "Cervical cancer can be caught early from images of cells, but a model a doctor can't question is hard to trust. Phoenix sorts each cell into one of five types, and shows which parts of the image it based that on.",
        did: [
          "Enhanced contrast and reduced noise in the SipakMed and Herlev cell images, keeping the features a diagnosis depends on.",
          "Trained convolutional neural networks to sort cells into five types.",
          "Used visual explanations to highlight the regions driving each prediction, so a doctor can check the model's reasoning.",
          "Put the model in the browser, at phoenix.meetbhatt.com.",
        ],
        result: "Manuscript in preparation. Runs live in the browser.",
        link: { label: "phoenix.meetbhatt.com", href: "https://phoenix.meetbhatt.com" },
        repo: "https://github.com/Meet2304/Project-Phoenix",
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
        kind: "research",
        when: "Jul 2025 to Oct 2025",
        impact: 2.3,
        line: "Stop harmful prompts before they reach a language model, and say why.",
        brief:
          "Caught malicious prompts before they reach a language model with 98.84% precision and 90.79% accuracy, by modelling the transitions in a prompt's text as a Markov chain and explaining which patterns made it risky. Published in Procedia Computer Science, 2026.",
        skills: ["Probabilistic modelling", "Markov chains", "AI safety", "Python"],
        aim: "Chatbots can be tricked by prompts written to make them misbehave. This research catches those prompts before they get through, and says why each one was flagged.",
        did: [
          "Developed a probabilistic detector that scores a prompt by the transitions between its text sequences, modelled as a Markov chain.",
          "Added an explanation module that highlights the high-risk patterns behind each flag.",
          "Reached 90.79% accuracy, 98.84% precision, 82.54% recall and an 89.96% F1 score on a malicious-prompt benchmark.",
          "Published the paper in Procedia Computer Science (2026).",
        ],
        stats: [
          { value: "98.84%", label: "precision" },
          { value: "90.79%", label: "accuracy" },
          { value: "89.96%", label: "F1 score" },
        ],
        result: "Published in Procedia Computer Science, 2026.",
        link: {
          verb: "Read",
          label: "the paper",
          href: "https://www.sciencedirect.com/science/article/pii/S1877050926016996",
        },
        repo: "https://github.com/Meet2304/Project-Vigil",
        media: {
          kind: "figure",
          src: "/figures/prompt-classifier.html",
          title: "Prompt checkpoint",
          caption: "Move across it to run the belt.",
        },
      },
      {
        id: "talaria",
        name: "Project Talaria",
        kind: "projects",
        when: "Jul 2025 to Nov 2025",
        impact: 2.4,
        line: "A shoe that tracks heart rate and gait, and forecasts both.",
        brief:
          "Built a smart shoe that forecasts 15 heart and gait signals 50 steps ahead with an R² of 0.97, by streaming its sensors to a cloud pipeline and training a recurrent neural network on 50,000+ sequences.",
        skills: [
          "Embedded systems (ESP32)",
          "Sensor integration",
          "Recurrent neural networks",
          "Time-series forecasting",
          "Firebase",
        ],
        aim: "Heart and gait data usually means a visit to a clinic. Talaria puts the sensors in a shoe, so they can be watched all day, and forecasts where they are heading.",
        did: [
          "Built a wearable on an ESP32 that streams heart rate, blood oxygen and motion-based gait data in real time.",
          "Sent every reading to a cloud pipeline for continuous monitoring, with live charts on the web.",
          "Trained a recurrent neural network on 50,000+ sequences to forecast 15 features 50 steps ahead, with an R² of 0.97 and a mean absolute error of 0.103.",
        ],
        stats: [
          { value: "0.97", label: "R², forecasting 15 signals" },
          { value: "50", label: "steps ahead" },
          { value: "50,000+", label: "training sequences" },
        ],
        result:
          "A working wearable, streaming live, with forecasts that closely follow the real signals.",
        link: { label: "talaria.meetbhatt.com", href: "https://talaria.meetbhatt.com" },
        repo: "https://github.com/Meet2304/Project-Talaria",
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
        kind: "experience",
        when: "Aug 2024 to Jun 2026",
        role: "RLHF Contributor → RLHF Team Lead → Lead Product Development Intern",
        impact: 3,
        line: "From annotating data to leading product development, in under two years.",
        brief:
          "Drove a 222% increase in project revenue in two months, by directing a summer intern team on fine-tuning models with human feedback and building internal performance tracking. Rose from RLHF contributor to leading product development, including Serin.",
        skills: [
          "RLHF",
          "Model fine-tuning",
          "Model evaluation",
          "Team leadership",
          "Product development",
        ],
        aim: "Blink Analytics builds AI and data products for other companies, including training language models with human feedback (RLHF). I joined to label data and grade model answers, and stayed to lead.",
        did: [
          "Annotated data and evaluated model outputs for human-feedback training.",
          "Promoted to RLHF team lead, then to lead product development intern.",
          "Directed a summer intern team on fine-tuning models with human feedback, with internal systems to track performance, driving a 222% increase in project revenue in two months.",
          "Led development of Serin, an AI interview and hiring platform.",
        ],
        stats: [
          { value: "222%", label: "more project revenue, in two months" },
          { value: "3", label: "roles, in under two years" },
        ],
        result: "Went on to lead development of Serin, Blink's AI hiring platform.",
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
        id: "serin",
        name: "Serin",
        kind: "experience",
        when: "2025 to Jun 2026",
        role: "Lead Product Development Intern, Blink Analytics",
        impact: 3,
        line: "An AI interview platform: live voice interviews, scored against the role, checked for cheating.",
        brief:
          "Led development of Serin, an AI platform that interviews job candidates by live voice and scores them against the role, by designing its real-time communication, language-model and cloud infrastructure, and the framework that evaluates each candidate.",
        skills: [
          "Language-model agents",
          "Real-time voice (LiveKit)",
          "Google Cloud",
          "Kubernetes",
          "System design",
        ],
        aim: "Hiring teams can't interview every applicant. Serin can: an AI interviewer talks with each candidate, scores the answers against the job, checks for cheating, and sums up who to hire.",
        did: [
          "Designed the real-time communication that carries each live voice interview.",
          "Designed the language-model and cloud infrastructure behind the interviewer.",
          "Built the framework that scores every candidate against the role.",
          "Led the team that built it.",
        ],
        result: "In private beta at serin-ai.com.",
        link: { label: "serin-ai.com", href: "https://serin-ai.com" },
        sameAs: "blink-analytics",
        media: {
          kind: "site",
          href: "https://serin-ai.com",
          label: "serin-ai.com",
          screens: [
            {
              src: "/work/serin/1-interview.webp",
              alt: "Serin: interview every candidate, hire the best one.",
            },
            {
              src: "/work/serin/2-scale.webp",
              alt: "Proven at scale: interviews around the clock, and cheating caught.",
            },
            {
              src: "/work/serin/3-role.webp",
              alt: "One line, full role: a job, its interview plan and rubric from one prompt.",
            },
            {
              src: "/work/serin/4-hire.webp",
              alt: "Hire the best candidate: every interview scored and summarised.",
            },
          ],
        },
      },
      {
        id: "icarus",
        name: "Project Icarus",
        kind: "projects",
        when: "Jul 2024 to Jun 2026",
        impact: 2,
        line: "A drone that flies on a flight controller I built.",
        brief:
          "Built and flew a custom drone on my own flight controller: a Teensy 4.0 on a circuit board I designed, with integrated sensors and flight-control code in C that holds it steady in the air.",
        skills: [
          "C / C++",
          "Teensy 4.0",
          "Circuit board design",
          "Sensor fusion",
          "Flight control",
        ],
        aim: "Most hobby drones fly on a ready-made flight controller. Icarus flies on one built from scratch, to learn what it takes for a drone to keep itself level.",
        did: [
          "Designed a custom circuit board around a Teensy 4.0 microcontroller.",
          "Integrated the motion sensors, and fused their readings to work out the drone's orientation.",
          "Wrote the flight control in C, holding the drone at a stable orientation in flight.",
        ],
        result: "Built and flown, with stable flight.",
        repo: "https://github.com/Meet2304/Project-Icarus",
        media: {
          kind: "figure",
          src: "/figures/icarus.html",
          title: "Icarus, inside",
          caption: "Point at a part to see what it does.",
        },
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
        when: "Sep 2022 to Jun 2026",
        role: "B.Tech in Computer Engineering",
        impact: 2.4,
        line: "B.Tech in Computer Engineering, minor in the Internet of Things.",
        brief:
          "Graduated with a 9.55 out of 10 GPA in Computer Engineering, with a minor in the Internet of Things, while publishing research and building hardware alongside the degree.",
        skills: ["Computer engineering", "Internet of Things", "Embedded systems"],
        aim: "Four years of computer engineering, with a minor in connected devices: the base that the research and the hardware here were built on.",
        did: [
          "Graduated with a GPA of 9.55 out of 10.",
          "Minor in the Internet of Things.",
          "Built Phoenix, Talaria and Icarus, and published the prompt classifier, alongside the degree.",
        ],
        stats: [{ value: "9.55", label: "GPA, out of 10" }],
        result: "Graduated June 2026.",
        media: {
          kind: "splat",
          color: "/work/pdeu/splat-color.webp",
          src: "/work/pdeu/splat.spz",
          turn: "/work/pdeu/splat-turn.webp",
          fov: 43.6,
          focus: 35.75,
          width: 1280,
          height: 853,
          alt: "Pandit Deendayal Energy University at sunset.",
          caption:
            "Pandit Deendayal Energy University, Gandhinagar. Drag to look around.",
        },
      },
      {
        id: "mind-ripple",
        name: "Mind Ripple",
        kind: "leadership",
        when: "Nov 2022 to Apr 2026",
        role: "Subcommittee Member → Head of Graphic Design → President → Advisor",
        impact: 2.6,
        line: "The university's quizzing club: member, head of design, president, advisor.",
        brief:
          "Grew the club's flagship escape room, Matrix Breakout, to 300+ participants, with earnings up 10% year over year, by leading a 30-member team as president of my university's quizzing club.",
        skills: ["Leadership", "Event management", "Graphic design"],
        aim: "Mind Ripple is PDEU's quizzing club. Its biggest event each year is Matrix Breakout, an escape room the club runs.",
        did: [
          "Rose from subcommittee member to head of graphic design, then president, then advisor.",
          "Led a 30-member team as president.",
          "Grew Matrix Breakout to 300+ participants, with earnings up 10% year over year.",
        ],
        stats: [
          { value: "300+", label: "participants" },
          { value: "30", label: "members led" },
          { value: "+10%", label: "earnings, year over year" },
        ],
        result: "The flagship event grew in reach and in earnings, year after year.",
        media: {
          kind: "figure",
          src: "/figures/mind-ripple.html",
          title: "Quiz round",
          caption: "Point at a buzzer to make that team first.",
        },
      },
      {
        id: "astar",
        name: "Astar Technologies",
        kind: "experience",
        when: "Dec 2023 to Jan 2024",
        role: "Lead Business and Data Analysis Intern",
        impact: 1.5,
        line: "Which sweets sell where, and when.",
        brief:
          "Identified the top-selling sweets by region and season to guide production and marketing, by cleaning raw sales data and forecasting demand with time-series models, Random Forest and XGBoost.",
        skills: [
          "Data cleaning",
          "Time-series forecasting",
          "Random Forest",
          "XGBoost",
        ],
        aim: "The question was simple: which sweets sell best, where, and in which season, so production and marketing could follow demand. The answer was in the sales data, once it was clean.",
        did: [
          "Cleaned and standardized raw sales data.",
          "Modelled regional and seasonal demand with time-series forecasting, Random Forest and XGBoost.",
          "Identified the top sellers by region and season, to guide production and marketing decisions.",
        ],
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
        kind: "leadership",
        when: "Jul 2021 to Jun 2022",
        role: "Charter President",
        impact: 2.1,
        line: "Founded it, and served as its charter president.",
        brief:
          "Founded a Rotary-affiliated service club as its charter president, and led 32 teenagers in service projects with nonprofits, including the Pratibha Foundation.",
        skills: ["Leadership", "Starting a team", "Nonprofit partnerships"],
        aim: "Interact clubs are Rotary's service clubs for young people. I founded this one, and led it through its first year.",
        did: [
          "Founded the club, and served as its first president.",
          "Led 32 members, all under 19, in service projects.",
          "Partnered with nonprofits, including the Pratibha Foundation.",
        ],
        stats: [{ value: "32", label: "members led" }],
        result: "Service projects with the Pratibha Foundation, among others.",
        media: {
          kind: "figure",
          src: "/figures/interact-club.html",
          title: "Together, for the street",
          caption: "Move across it to bring the members in.",
        },
      },
    ],
  },
];

export const UNITS: Unit[] = COLLECTIONS.flatMap((c) => c.units);

export const unitById = (id: string) => UNITS.find((u) => u.id === id);

/** The latest news (see News), or null when there is none. */
export const NEWS: News | null = {
  id: "hackathon-wins",
  before:
    "Two hackathon wins: Grand winner at Hack-Nation, and the World Bank's Health track. Speaking in Seoul on 21 Oct.",
  after:
    "Two hackathon wins: Grand winner at Hack-Nation, and the World Bank's Health track, with a talk in Seoul.",
  turn: "2026-10-21T12:00:00+09:00",
  until: "2026-12-15T00:00:00-05:00",
};

/** Where Meet can be reached, used by the home page's closing chapter. */
export const CONTACT = {
  email: "mbbhatt@andrew.cmu.edu",
  github: "https://github.com/Meet2304",
  linkedin: "https://www.linkedin.com/in/meet-bhatt2304/",
  /* Opened in a new tab, in the browser's own viewer (no download): replace
     the file to update it. */
  resume: "/meet-bhatt-resume.pdf",
} as const;
