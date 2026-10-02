/**
 * The pages seen in this visit, in order, kept by SiteChrome (mounted for
 * the whole visit): so a "back" link (back-link.tsx) knows whether there is
 * a page of this site to step back to, and can wait for it to be shown.
 */
const trail: string[] = [];
let waiting: (() => void)[] = [];

export const notePath = (path: string) => {
  if (trail[trail.length - 1] === path) return;
  /* Arriving at the page before the last is a step back; anything else, a
     step on. */
  if (trail[trail.length - 2] === path) trail.pop();
  else trail.push(path);
  const done = waiting;
  waiting = [];
  done.forEach((fn) => fn());
};

/** Whether there is a page of this site to go back to. */
export const canGoBack = () => trail.length > 1;

/** Resolves once the next page has been put on screen (or after `ms`). */
export const nextPage = (ms = 1500) =>
  new Promise<void>((resolve) => {
    waiting.push(resolve);
    window.setTimeout(resolve, ms);
  });

/* A chapter asked for from another page's bar, for the universe to fly to
   once it is open (page-nav.tsx). */
let chapter: number | null = null;

export const requestChapter = (n: number) => {
  chapter = n;
};

export const takeChapter = () => {
  const n = chapter;
  chapter = null;
  return n;
};
