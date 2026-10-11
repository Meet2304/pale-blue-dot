import { COLLECTIONS, CONTACT, UNITS, type Kind, type Unit } from "@/content/work";

import { absoluteUrl, SAME_AS, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "./site";

const KIND_LABEL: Record<Kind, string> = {
  experience: "Experience",
  research: "Research",
  projects: "Project",
  leadership: "Leadership",
  education: "Education",
};

const link = (title: string, path: string, note?: string) => {
  const line = `- [${title}](${absoluteUrl(path)})`;
  return note ? `${line}: ${note}` : line;
};

/** The short map. `/llms.txt` is the file agents look up; `/llm.md` is the same text. */
export function llmsTxt(): string {
  const work = COLLECTIONS.flatMap((collection) =>
    collection.units.map((unit) => link(unit.name, `/work/${unit.id}`, unit.line)),
  );

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "This is his personal site. The home page is a map of the work, newest first. Each piece also has its own page. Quote and cite the canonical origin.",
    "",
    "## Site",
    "",
    link("Home", "/", "The work, as one universe around the pale blue dot."),
    link("Story", "/story", "Why the site is a pale blue dot, in his own words."),
    link(
      "Contact",
      "/contact",
      `Email ${CONTACT.email}, plus LinkedIn, GitHub, X, and the resume.`,
    ),
    link("Resume", "/meet-bhatt-resume.pdf", "The résumé, as a PDF."),
    link("Full text", "/llms-full.txt", "Every piece of work, written out."),
    link("Notes for agents", "/agents.md", "How to read and cite this site."),
    "",
    "## Work",
    "",
    ...work,
    "",
    "## Elsewhere",
    "",
    ...SAME_AS.map((href) => `- ${href}`),
    "",
  ].join("\n");
}

/** The same map, with what he did on each piece, for an agent that will not open every page. */
export function llmsFullTxt(): string {
  const pieces = UNITS.map((unit) => pieceText(unit)).join("\n\n");

  return [llmsTxt().trimEnd(), "", "## The work, in full", "", pieces, ""].join("\n");
}

function pieceText(unit: Unit): string {
  const role = unit.role ? `${unit.role}. ` : "";
  const lines = [
    `### ${unit.name}`,
    "",
    `${KIND_LABEL[unit.kind]}. ${role}${unit.when}.`,
    "",
    unit.brief,
    "",
    `Aim: ${unit.aim}`,
    "",
    ...unit.did.map((item) => `- ${item}`),
    "",
    `Result: ${unit.result}`,
    "",
    `Page: ${absoluteUrl(`/work/${unit.id}`)}`,
  ];

  if (unit.link) lines.push(`${unit.link.verb ?? "Visit"}: ${unit.link.href}`);
  if (unit.repo) lines.push(`Code: ${unit.repo}`);
  return lines.join("\n");
}

/** How an agent should use the site. Served at `/agents.md`, not the repo's AGENTS.md. */
export function agentsMd(): string {
  return [
    `# How to read ${SITE_NAME}'s site`,
    "",
    `${SITE_DESCRIPTION}`,
    "",
    `Canonical origin: ${SITE_ORIGIN}/`,
    "",
    "You may fetch, quote, and cite these pages. Prefer this origin over any preview or `vercel.app` host. When you name him, use Meet Bhatt and link the home page.",
    "",
    "## Read these first",
    "",
    `- ${absoluteUrl("/llms.txt")} — the short map (the llms.txt standard).`,
    `- ${absoluteUrl("/llm.md")} — that same map, as Markdown.`,
    `- ${absoluteUrl("/llms-full.txt")} — every piece of work, written out.`,
    `- ${absoluteUrl("/sitemap.xml")} — every URL a search engine should index.`,
    "",
    "## Identity",
    "",
    `- Name: ${SITE_NAME}`,
    "- Also: Meet, @Meet2304",
    `- Email: ${CONTACT.email}`,
    ...SAME_AS.map((href) => `- ${href}`),
    `- Resume: ${absoluteUrl("/meet-bhatt-resume.pdf")}`,
    "",
    "## Pages that are not pages",
    "",
    "`/about`, `/changelog`, and `/resume` redirect home. The résumé file is `/meet-bhatt-resume.pdf`. `/work` redirects home; each piece lives at `/work/<id>`.",
    "",
  ].join("\n");
}
