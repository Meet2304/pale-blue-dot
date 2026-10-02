/**
 * In-app destinations. Always a path beginning with `/`, never a host.
 *
 * `<Link href>` and `next/image` src values are resolved against the current
 * origin. Hardcoding a Vercel preview URL (or any other domain) would send
 * visitors on a custom production domain to the wrong place. Keep every
 * internal jump host-relative so preview, `*.vercel.app`, and a connected
 * domain all resolve the same route.
 */
export const routes = {
  home: "/",
  about: "/about",
  work: "/work",
  story: "/story",
  contact: "/contact",
  changelog: "/changelog",
  resume: "/resume",
} as const;

export type Route = (typeof routes)[keyof typeof routes];

/**
 * Pages built on the Terminal system: the universe at `/`, the contact page,
 * and the per-unit pages under `/work/`. They draw their own sky and their own controls, so the
 * Horizon chrome (star field, nav bar, edge blurs, dot-field footer) stands
 * down on them.
 */
export const isTerminalRoute = (pathname: string) =>
  pathname === routes.home ||
  pathname === routes.story ||
  pathname === routes.contact ||
  pathname.startsWith(`${routes.work}/`);
