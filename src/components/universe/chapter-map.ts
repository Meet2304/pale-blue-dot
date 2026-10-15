/**
 * Where the camera is, for how far the page has scrolled through the
 * universe's chapters.
 *
 * A chapter is at least a screen tall, and taller when its words and
 * picture need the room (a piece of work, on a phone). The camera frames a
 * chapter's body when the chapter's top reaches the top of the screen,
 * holds it there while the rest of the chapter is read, and moves on to the
 * next body only over the last screen of scrolling, as the next chapter
 * rises into view. With every chapter a screen tall this is one chapter
 * per screen, as it always was.
 */

/** Each chapter's top and height, in px from the top of the section. */
export type ChapterSpans = { tops: number[]; heights: number[] };

export const noSpans: ChapterSpans = { tops: [], heights: [] };

/** Measure the chapters (`[data-chapter]`) inside `section`. */
export function measureChapters(section: HTMLElement): ChapterSpans {
  const top = section.getBoundingClientRect().top;
  const tops: number[] = [];
  const heights: number[] = [];
  section.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => {
    const r = el.getBoundingClientRect();
    tops.push(r.top - top);
    heights.push(r.height);
  });
  return { tops, heights };
}

/**
 * The camera's place, in chapters (0 is Earth, 1.5 halfway from the dot to
 * the sky), with the page scrolled `y` px into the section and a screen
 * `view` px tall.
 */
export function chapterAt({ tops }: ChapterSpans, y: number, view: number) {
  const n = tops.length;
  if (n === 0) return 0;
  let i = 0;
  while (i < n - 1 && y >= tops[i + 1]) i++;
  if (i === n - 1) return n - 1;
  /* The move to the next chapter starts a screen before it arrives, but
     never before this chapter has itself arrived. */
  const start = Math.max(tops[i], tops[i + 1] - view);
  const span = tops[i + 1] - start;
  return i + Math.min(1, Math.max(0, span > 0 ? (y - start) / span : 1));
}
