/**
 * The opening's timeline: when each letter decodes, when the text ticks,
 * and which glyph a decoding letter shows. Pure and fixed, so the opening
 * looks and sounds exactly the same on every visit, and the sound and the
 * glyphs keep one clock: every tick is a visible change in the text.
 *
 * Times are in ms from the moment the first word begins.
 */

/* The words, and when each begins. The pause after "Hola!" is the one a
   person takes before saying who they are. */
export const WORDS = [
  { text: "Hola!", at: 0 },
  { text: "I'm", at: 1250 },
  { text: "Meet", at: 1540 },
];

export const TEXT = WORDS.map((w) => w.text).join(" ");

/* The terminal's light glyphs, the ones the bodies are drawn with. */
export const GLYPHS = ["·", ":", "+", "×", "=", "~", "-", "*", ";"];

/* How long a letter shows glyphs before it settles. */
export const SCRAMBLE = 240;

/* The gaps between letters starting inside a word. Uneven on purpose: text
   streaming out of a model arrives in bursts, not on a metronome. */
const LETTER_GAPS = [62, 48, 55, 78, 44, 66, 52, 71];

/* When each letter starts to decode. */
export const LETTER_AT = WORDS.flatMap((w, wi) => {
  let t = w.at;
  return [...w.text].map((_, i) =>
    i === 0 ? t : (t += LETTER_GAPS[(wi * 3 + i) % LETTER_GAPS.length]),
  );
});

/* Under reduced motion nothing decodes: each word appears whole. */
export const WORD_AT = WORDS.flatMap((w) => [...w.text].map(() => w.at));

export const PERIOD_AT = LETTER_AT[LETTER_AT.length - 1] + SCRAMBLE + 160;

/* The gaps between ticks while a word decodes, within the 43 to 82 ms the
   reference's ticks keep: close enough to read as one stream, uneven
   enough not to sound like a clock. */
const TICK_GAPS = [52, 61, 45, 70, 48, 66, 57, 43, 74, 50];

/* The stretches when text is loading: each word from its first glyph to
   the moment its last letter settles, merged where words overlap ("I'm" is
   still settling as "Meet" begins), so they read as one stream. */
export const LOADING = (() => {
  const spans: [number, number][] = [];
  let first = 0;
  for (const w of WORDS) {
    const last = first + w.text.length - 1;
    const span: [number, number] = [LETTER_AT[first], LETTER_AT[last] + SCRAMBLE];
    const prev = spans[spans.length - 1];
    if (prev && span[0] <= prev[1]) prev[1] = Math.max(prev[1], span[1]);
    else spans.push(span);
    first = last + 1;
  }
  return spans;
})();

/* The ticks: a continuous run through each loading stretch, ending on the
   moment its last letter settles, and silence between. The last gap in a
   run is kept long enough that the final two ticks stay distinct. */
export const TICK_AT = (() => {
  const ticks: number[] = [];
  let k = 0;
  for (const [begin, end] of LOADING) {
    for (let t = begin; t < end - 38; t += TICK_GAPS[k++ % TICK_GAPS.length]) {
      ticks.push(t);
    }
    ticks.push(end);
  }
  return ticks;
})();

/* Under reduced motion, one tick as each word appears. */
export const CALM_TICK_AT = WORDS.map((w) => w.at);

/**
 * The glyph letter `i` shows at time `t`, or "" when it is not decoding.
 * Glyphs change only on ticks, so what you see and what you hear agree.
 */
export function glyphAt(i: number, t: number) {
  const start = LETTER_AT[i];
  if (t < start || t >= start + SCRAMBLE) return "";
  let n = 0;
  while (n < TICK_AT.length && TICK_AT[n] <= t) n++;
  return GLYPHS[(n + i * 3) % GLYPHS.length];
}

/** The letters decoding at time `t`, for placing a tick left or right. */
export function decodingAt(t: number, starts = LETTER_AT, scramble = SCRAMBLE) {
  const on: number[] = [];
  starts.forEach((s, i) => {
    if (t >= s && t <= s + scramble) on.push(i);
  });
  return on;
}
