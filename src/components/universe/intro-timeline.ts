/**
 * Timelines for text that is spoken onto the screen: when each letter
 * decodes, when the text ticks, and which glyph a decoding letter shows.
 * Pure and fixed, so a line looks and sounds exactly the same every time,
 * and the sound and the glyphs keep one clock: every tick is a visible
 * change in the text.
 *
 * Times are in ms from the moment the first word begins.
 */

/* The terminal's light glyphs, the ones the bodies are drawn with. */
export const GLYPHS = ["·", ":", "+", "×", "=", "~", "-", "*", ";"];

/* How long a letter shows glyphs before it settles. */
export const SCRAMBLE = 240;

/* The gaps between letters starting inside a word. Uneven on purpose: text
   streaming out of a model arrives in bursts, not on a metronome. */
const LETTER_GAPS = [62, 48, 55, 78, 44, 66, 52, 71];

/* The gaps between ticks while text decodes, within the 43 to 82 ms the
   reference's ticks keep: close enough to read as one stream, uneven
   enough not to sound like a clock. */
const TICK_GAPS = [52, 61, 45, 70, 48, 66, 57, 43, 74, 50];

/**
 * A word to speak. `at` fixes when it begins; without it, it follows the
 * word before after a short gap, as speech does. `pace` scales the gaps
 * between its letters (below 1 is quicker).
 */
export type Word = { text: string; at?: number; pace?: number };

export type Spoken = ReturnType<typeof speak>;

/** `scramble`: how long each letter shows glyphs before it settles. */
export function speak(words: Word[], wordGap = 110, scramble = SCRAMBLE) {
  const letterAt: number[] = [];
  const wordAt: number[] = [];
  const spans: [number, number][] = [];
  let lastStart = 0;
  const placed = words.map((w, wi) => {
    const at = w.at ?? lastStart + wordGap;
    let t = at;
    [...w.text].forEach((_, i) => {
      if (i > 0)
        t += Math.round(LETTER_GAPS[(wi * 3 + i) % LETTER_GAPS.length] * (w.pace ?? 1));
      letterAt.push(t);
      wordAt.push(at);
    });
    lastStart = t;
    spans.push([at, t + scramble]);
    return { text: w.text, at };
  });

  /* The stretches when text is loading: each word from its first glyph to
     the moment its last letter settles, merged where words overlap, so a
     phrase reads as one stream. */
  const loading: [number, number][] = [];
  for (const span of spans) {
    const prev = loading[loading.length - 1];
    if (prev && span[0] <= prev[1]) prev[1] = Math.max(prev[1], span[1]);
    else loading.push([...span]);
  }

  /* The ticks: a continuous run through each loading stretch, ending on the
     moment its last letter settles, and silence between. The last gap in a
     run is kept long enough that the final two ticks stay distinct. */
  const ticks: number[] = [];
  let k = 0;
  for (const [begin, end] of loading) {
    for (let t = begin; t < end - 38; t += TICK_GAPS[k++ % TICK_GAPS.length])
      ticks.push(t);
    ticks.push(end);
  }

  return {
    words: placed,
    text: placed.map((w) => w.text).join(" "),
    scramble,
    letterAt,
    /** Under reduced motion nothing decodes: each word appears whole. */
    wordAt,
    loading,
    ticks,
    /** Under reduced motion, one tick as each word appears. */
    calmTicks: [...new Set(placed.map((w) => w.at))],
    /** When the last letter settles. */
    end: Math.max(...spans.map((sp) => sp[1])),
    /**
     * The glyph letter `i` shows at time `t`, or "" when it is not
     * decoding. Glyphs change only on ticks, so what you see and what you
     * hear agree.
     */
    glyphAt(i: number, t: number) {
      const start = letterAt[i];
      if (t < start || t >= start + scramble) return "";
      let n = 0;
      while (n < ticks.length && ticks[n] <= t) n++;
      return GLYPHS[(n + i * 3) % GLYPHS.length];
    },
    /** The letters decoding at time `t`, for placing a tick left or right. */
    decodingAt(t: number, calm = false) {
      const starts = calm ? wordAt : letterAt;
      const span = calm ? 0 : scramble;
      const on: number[] = [];
      starts.forEach((st, i) => {
        if (t >= st && t <= st + span) on.push(i);
      });
      return on;
    },
  };
}

/* ------------------------------------------------------------ The opening */

/* The greeting. The pause after "Hola!" is the one a person takes before
   saying who they are. */
const GREETING: Word[] = [
  { text: "Hola!", at: 0 },
  { text: "I'm", at: 1250 },
  { text: "Meet", at: 1540 },
];

export const GREETING_WORDS = GREETING.map((w) => w.text);

/* The pale blue full stop lights a moment after "Meet" has settled. */
export const PERIOD_AT = speak(GREETING).end + 160;

/* Then, after a breath, the line that says what the dot is. It is also the
   hero's headline: in the opening it is spoken, then it flies into place. It
   is longer, so it is spoken a little quicker. */
export const HEADLINE = "I am an Engineer.";
export const HEADLINE_WORDS = HEADLINE.split(" ");
const SUB_PAUSE = 750;

/** The whole opening, greeting and second line, on one clock. */
export const OPENING = speak([
  ...GREETING,
  ...HEADLINE_WORDS.map((text, i) => ({
    text,
    at: i === 0 ? PERIOD_AT + SUB_PAUSE : undefined,
    pace: 0.72,
  })),
]);

/* ------------------------------------------------- The dot, and the sky */

/* The titles further out, each spoken as it scrolls into view: in a
   flash, since the visitor is moving and may be moving fast; all of it has
   settled in about half a second. First Earth as a point of light; then,
   further out, everything around it. */
const title = (line: string) =>
  speak(
    line
      .split(" ")
      .map((text, i) => ({ text, at: i === 0 ? 0 : undefined, pace: 0.16 })),
    24,
    90,
  );

export const DOT_TITLE = title("This pale blue dot is where I build things.");
export const SKY_TITLE = title("This is my impact so far.");
