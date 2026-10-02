# A footer, a contact page, and pictures that always show

- **Date:** 1 October 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Meet asked to remove the index from the home page and the "Drawn as…"
  line from each piece; to add a minimal, creative footer with every page and his
  profiles (logos from svglogos.dev); to name his degree in full on the Carnegie
  Mellon piece; to fix pictures that did not show (the Corporate Startup Lab's logo
  on his laptop but not his larger display, and Linea's preview screens); and to make
  "say hello" a contact page rather than an email link.

## Removed

- The index table at the foot of the home page, and its link in the bar's panels
  ("all 12 in the index"), with its styles.
- "Drawn as a black hole. School: the deepest gravity…" from every piece. The
  bar's panels still say what each body stands for.

## Carnegie Mellon

The piece now reads: "Pursuing a Master of Science in Artificial Intelligence
Engineering – Engineering and Technology Innovation Management, as a J N Tata
Scholar." Its `line` names the degree the same way.

## Pictures that always show

The pictures went through `next/image`, which resizes each on request and leaves
when to load to the browser's lazy loading. That failed twice: a picture that never
appeared at one screen size, and a site's later screens, clipped inside the frame
(only one shows at a time), never loading, because a browser's lazy loading treats a
clipped image as off screen.

Now:

- Every picture is a plain file in `public/work/<piece>/`, WebP, in two sizes: the
  file, and a half-size copy named `-sm.webp` for small screens. They are served as
  they are, with nothing resizing them on the way.
- The site screens were captured again, from the live sites at 1280 × 800, each only
  once every image and font on it had loaded (Linea, Phoenix, Talaria, Blink
  Analytics, Astar). Carnegie Mellon's photo (1600 × 800) and the Corporate Startup
  Lab's logo (960 × 720) were made from Meet's originals in `public/assets/`; the
  logo went from 968 KB to 13 KB.
- `picture.tsx` draws them with a plain `<img>`, and the picture's frame decides when
  to load: all its pictures start fetching together when it is about two screens
  away, clipped or not.

Checked by scrolling the whole home page at 1366 × 768 (at 1.25× scaling, like a
laptop) and on a phone: all 27 pictures loaded.

## The footer (`footer.tsx`)

On the home page (where the index was), the contact page and each piece of work's
page. It reads as a sign-off from the pale blue dot:

- one hairline across the top is an orbit, and the dot travels along it, slowly
  (48 s across), with a faint trail;
- the full mark, "meet.", large, from the same cut-out letters as the bar's logo;
- "Sent from the pale blue dot." and a live line: "Pittsburgh · 12:34 am · 40.44° N,
  79.94° W", the time there kept current;
- two quiet columns: **Pages** (Home, Story, Contact, Resume) and **Elsewhere**
  (LinkedIn, GitHub, X, Email);
- "© 2026 Meet Bhatt" and "Back to Earth ↑", which returns to the top.

The profile marks are svglogos.dev's (`cdn.svglogos.dev/logos/github-icon.svg`,
`linkedin-icon.svg`, `x.svg`), kept as downloaded in `public/logos/social/`. GitHub's
and X's marks are black, which would vanish here, so all three are used as masks in
the text's colour; LinkedIn's takes its own blue under the pointer. Under reduced
motion the dot rests. The Horizon pages' footer gained a Contact link too.

## The contact page (`/contact`)

Simple for now; a fuller design is to come. In the home page's own type: "Back to
the universe", then "Contact / Say hello." and a line, the email address large with
a Copy button (for anyone without a mail app set up), and rows for LinkedIn, GitHub,
X and the resume, each with its mark. The pale blue dot sits in the sky to the right,
marked "you are here". Then the footer.

Every "say hello" now goes there: the bar, the bar's panels, the phone menu, and
the links at the end of the home page. `/contact` no longer redirects to the home
page, and is a Terminal page (`isTerminalRoute`), so the Horizon chrome stands down.

## Verification

`npm run ci` passes. Checked in Chrome at 1366 × 768 (1.25×), 1440 × 900 and
390 × 844: every picture loads, the footer at the end of the home page, the contact
page, and no console errors or failed requests.
