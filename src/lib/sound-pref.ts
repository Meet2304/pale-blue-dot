/* Whether the visitor has silenced the site's sound (the music and the
   clicks), remembered between visits. */

const KEY = "pbd-muted";
const listeners = new Set<() => void>();

export const subscribeMuted = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export const getMuted = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const setMuted = (muted: boolean) => {
  try {
    localStorage.setItem(KEY, muted ? "1" : "0");
  } catch {}
  listeners.forEach((fn) => fn());
};
