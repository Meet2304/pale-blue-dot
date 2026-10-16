# Individual work sharing cards

All 15 `/work/[slug]` pages now explicitly select a 1200 × 630 JPEG from `/og/work/<slug>.jpg` for both Open Graph and X large-card previews. The page title, description and canonical URL still come from the work content. Images resolve against the existing `metadataBase`, allowing previews to serve their own assets. The landing page keeps its original file-based images.

## Visual continuity

The cards reuse the website's `PORTRAITS`, `drawBody`, `lookOf`, `lookColors`, `reachOf`, and layout seed, with IBM Plex Sans and Mono. The category palette supplies labels and title accents. Individual bodies keep their original palette overrides, geometry, glyphs, rings, corona and glow. Stars are the website's spherical stellar bodies.

The final composition enlarges bodies approximately 1.6–1.8 times over the initial review, allows their outer forms to extend beyond the frame, adds delicate orbital arcs and a richer star field, and reserves a shaded region for readable text. Animation is frozen at the work portrait's reduced-motion orientation. No generative-image reinterpretation is used.

## Regeneration

`scripts/render-work-og.cjs` exports PNG masters, delivery JPEGs, a gallery and a metadata manifest to `.cache/work-og` (or `OG_OUTPUT_DIR`). It does not modify production assets automatically. Inspect the output, then copy the approved JPEGs to `public/og/work`.

The script requires repository dependencies, compiled IBM Plex font assets from a previous Next.js build in `.next/static`, and Playwright with a browser. Use an existing Playwright installation via `PLAYWRIGHT_MODULE_PATH`, or install Playwright locally without saving it to the project. `OG_BROWSER_CHANNEL` may select an installed browser such as `msedge` or `chrome`; otherwise Playwright's Chromium is used. No browser or image-generation dependencies ship to website visitors.

```sh
node scripts/render-work-og.cjs
```

Copy is intentionally concise for share previews. When adding a work unit, add its card copy to the renderer, render its image, and verify the complete set before publishing.

## Validation

Run the repository's `npm run ci`. Against a running production build, run:

```sh
node scripts/check-work-og.cjs http://localhost:3100
```

The verifier compares the work index with the image set, checks one matching OG and Twitter image per page, nonempty titles/descriptions/alt text, canonical URLs, dimensions, JPEG response bytes and sizes, preserved landing images, and the unknown-slug 404. This specifically catches accidental fallback to the inherited landing image. Social platforms may retain cached cards for previously shared URLs until refreshed.
