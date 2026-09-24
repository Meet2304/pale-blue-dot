/**
 * One set of words for all five concepts, so they can be compared on design
 * alone.
 *
 * Anything drawn from `plans/pale-blue-dot-concept.md` is real. Anything
 * marked PLACEHOLDER is a stand-in written to the right length and shape —
 * replace it before any of this leaves the play branch.
 */

export const person = {
  name: "Meet Bhatt",
  /** The thesis from the concept doc, said plainly. */
  thesis: "I take the whole thing, not the piece I'm handed.",
  heroLine: "What's missing, I make.",
  /** PLACEHOLDER — who you are in two sentences. */
  intro:
    "I build products end to end: the idea, the design, the code, and the decisions nobody else wants to own. I'd rather carry the whole thing than polish one corner of it.",
  /** PLACEHOLDER — where you are. */
  location: "Earth, mostly India",
  whyShort:
    "Everything anyone has ever built happened on one point of light. I want to add something to it.",
};

export type Project = {
  name: string;
  /** One line: the ownership move. */
  move: string;
  before: string;
  choice: string;
  tradeoff: string;
  shift: string;
};

/**
 * The four-part shape from the concept doc. The moves are real; the body copy
 * is PLACEHOLDER written to that shape.
 */
export const projects: Project[] = [
  {
    name: "Serin",
    move: "Led it end to end instead of staying in one lane.",
    before: "An idea with a capable team around it and nobody holding the whole of it.",
    choice: "I took product, design and delivery as a single job.",
    tradeoff: "Staying in my lane was the safer line on a résumé.",
    shift: "I plan from the finished thing backwards now.",
  },
  {
    name: "Project Phoenix",
    move: "Took it on without being assigned it.",
    before: "Something everyone agreed mattered and no one owned.",
    choice: "I picked it up before anyone asked me to.",
    tradeoff: "It was easier to wait to be handed it, or never be.",
    shift: "I don't wait for permission on work that's obviously needed.",
  },
  {
    name: "Linea",
    move: "Built the missing piece myself.",
    before: "A gap between what the tools did and what the work needed.",
    choice: "I made the tool rather than working around the gap.",
    tradeoff: "A workaround would have shipped sooner.",
    shift: "I notice what's missing faster than I notice what's there.",
  },
];

/**
 * Inflection points, not a life log. The Astar decision is real; the years and
 * the other entries are PLACEHOLDER.
 */
export const turns = [
  {
    year: "2023",
    text: "Started building things nobody asked for, and finishing them.",
  },
  { year: "2024", text: "Took on Project Phoenix without being assigned it." },
  {
    year: "2025",
    text: "Turned down Astar, a ready-made path, for one I'd have to build.",
  },
  { year: "2026", text: "Started The Pale Blue Dot, in public, one piece at a time." },
];

/**
 * PLACEHOLDER groupings, seeded from what this repository itself evidences: a
 * design system, a canvas hero, CI gates, and a site written as prose.
 */
export const skills = [
  {
    group: "Product",
    items: ["Scoping from zero", "Product strategy", "Writing it down"],
  },
  { group: "Design", items: ["Interface design", "Design systems", "Motion"] },
  {
    group: "Engineering",
    items: [
      "TypeScript",
      "React and Next.js",
      "Canvas graphics",
      "CI and quality gates",
    ],
  },
  { group: "Leading", items: ["Owning delivery", "Small teams", "Making the call"] },
];

/** PLACEHOLDER — what's live in your life right now. */
export const now = [
  "Building this site, in the open.",
  "Writing up Serin and Phoenix as decisions rather than feature lists.",
  "Looking for work where I can own something whole.",
];

export const socials = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/meet-bhatt-655a89250/" },
  { label: "GitHub", href: "https://github.com/Meet2304" },
  { label: "X", href: "https://twitter.com/Meet2304" },
];
