# Story page, on any host

- **Date:** 23 August 2026
- **Branch:** `feat/story-page`
- **Why:** Clicking Story still served the coming-soon placeholder, and any
  internal link that named a Vercel host would miss a custom production
  domain.

## What changed

**The route is the Note.** `/story` is no longer a placeholder. It is the
photograph, then the letter, then a name. The still lives at
`public/pale-blue-dot.jpg` and is requested as `/pale-blue-dot.jpg` — a
host-relative path, so the same file is served on localhost, a preview URL,
`*.vercel.app`, and a connected domain.

**Links never name a host.** `src/lib/routes.ts` is the one list of in-app
destinations. Every `<Link>` and the résumé href read from it. Next.js
resolves `/story` against the origin the visitor is already on. Do not
introduce `basePath`, `assetPrefix`, or `metadataBase` pointed at a preview
URL: those pin the client to one origin and a custom domain then fetches
JS/CSS (or navigates) somewhere else.

**Signature font is route-local.** `Mrs_Saint_Delafield` loads only on
`/story`, so the four site faces are not paying for a script hand.

## Files

| Path                                     | Role                                          |
| ---------------------------------------- | --------------------------------------------- |
| `src/lib/routes.ts`                      | Host-relative path constants.                 |
| `src/app/story/page.tsx`                 | The Note.                                     |
| `src/app/story/loading.tsx`              | Same proportions while the RSC is in flight.  |
| `src/components/site/the-photograph.tsx` | 16:9 plate, native dialog for the full still. |
| `src/components/site/the-note.tsx`       | The letter.                                   |
| `src/styles/horizon/note.css`            | Plate, lightbox, letter.                      |
| `src/components/animate-ui/icons/x.tsx`  | Lightbox close.                               |
| `public/pale-blue-dot.jpg`               | Voyager still.                                |
| `next.config.ts`                         | Explicitly no `basePath` / `assetPrefix`.     |
