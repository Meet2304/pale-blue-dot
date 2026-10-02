/**
 * In-app destinations. Always a path beginning with `/`, never a host, so
 * preview, `*.vercel.app` and the production domain all resolve the same.
 */
export const routes = {
  home: "/",
  work: "/work",
  story: "/story",
  contact: "/contact",
} as const;
