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
