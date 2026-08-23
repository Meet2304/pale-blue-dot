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
