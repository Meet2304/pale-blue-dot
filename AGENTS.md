<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Portfolio analytics

For analytics requests about this portfolio, use the connected `analytics-mcp` tools with Google Analytics property `558365616` (Pale Blue Dot), account `370470393`.

- Production website: `https://www.meetbhatt.com`.
- Google tag measurement ID in `src/lib/site.ts`: `G-73KX8NNENQ`.
- Default production reports to an exact `hostName` filter of `www.meetbhatt.com`; this property also receives localhost and Vercel preview traffic. Include those only when requested or investigating testing activity.
- The property's reporting timezone is `America/Los_Angeles`; disclose this when reporting date boundaries.
- The existing local user-level Analytics MCP connection was verified with a successful report on 2026-10-15. Reuse it while access works; other environments must authenticate independently.
- OAuth client files such as `pale-blue-dot-analysis-oauth.json` contain secrets. Do not print their contents, commit them, or include them in website assets.
