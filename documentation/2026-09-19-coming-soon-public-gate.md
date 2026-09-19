# Coming-soon public gate

- **Date:** 19 September 2026
- **Branch:** `feat/coming-soon-gate`
- **Why:** Keep the unfinished portfolio private while preserving the visual language
  and the Story that explains the project.

## Public surface

The root route is now a minimal coming-soon page using Horizon typography, the
post-warp twinkling star field, a restrained horizon glow, and staggered entrance
motion. The only content route linked from it is `/story`.

Navigation and the Story footer expose only Home and Story. Existing development
routes remain in source control, but `/about`, `/work`, `/contact`, `/changelog`, and
`/resume` receive temporary redirects to `/`. `robots.txt` also disallows those paths.

## Responsive behavior

- Fluid type and bounded content widths cover phones through ultrawide displays.
- `min-height: 100svh` allows short screens to scroll instead of clipping content.
- A height breakpoint compresses the layout for phone landscape and split-screen
  windows.
- Narrow breakpoints reduce navigation and heading density down to 320px widths.
- Safe-area insets and `viewport-fit=cover` protect controls on notched devices.
- Reduced-motion preferences remove entrance and hover movement.

## Verification

`npm run ci` passes: format, lint with zero warnings, type generation and TypeScript,
and the production build. Production-server checks return `200` for `/`, `/story`, and
`/robots.txt`, and `307 /` for every hidden development route.
