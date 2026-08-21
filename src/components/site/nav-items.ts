/**
 * The site's whole internal link graph, in five single words.
 *
 * Single words because the bar is a tool, not a statement — "Story" rather than
 * "The Note", "Work" rather than "Selected Projects".
 */
export const NAV_ITEMS = [
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/story", label: "Story" },
  { href: "/contact", label: "Contact" },
  { href: "/changelog", label: "Changelog" },
] as const;

/**
 * Flip this — and drop the file at `public/resume.pdf` — when the resume is
 * ready, then delete `src/app/resume/page.tsx`. Until then the control points
 * at a real route rather than at a missing file: an `<a download>` aimed at a
 * 404 navigates away silently, which is a worse failure than an honest page.
 */
export const RESUME_READY = false;
export const RESUME_HREF = RESUME_READY ? "/resume.pdf" : "/resume";
