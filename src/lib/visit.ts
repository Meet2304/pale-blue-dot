/**
 * Where the visitor was before this page, within this visit: so a "back"
 * link can step back through history (to the same place on the page they
 * left) instead of opening a fresh copy of it. Kept by SiteChrome, which is
 * mounted for the whole visit.
 */
let current: string | null = null;
let previous: string | null = null;

export const notePath = (path: string) => {
  if (path === current) return;
  previous = current;
  current = path;
};

export const cameFrom = () => previous;

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

/* Where the universe was scrolled to when last seen, and where to put it
   back when a page's way back opens it again (back-link.tsx). */
let homeAt = 0;
let restore: number | null = null;

export const noteHomeScroll = (y: number) => {
  homeAt = y;
};

export const requestHomeRestore = () => {
  restore = homeAt;
};

export const takeHomeRestore = () => {
  const y = restore;
  restore = null;
  return y;
};
