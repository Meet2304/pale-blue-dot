import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { plexVariables } from "@/app/fonts";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { BodyPortrait } from "@/components/universe/body-portrait";
import { Footer } from "@/components/universe/footer";
import { PageNav } from "@/components/universe/page-nav";
import { WayMark } from "@/components/universe/way-mark";
import { KINDS, kindColors } from "@/components/universe/encoding";
import { UNITS, unitById } from "@/content/work";

import s from "./work.module.css";

/* Every unit on the map has a page, and nothing else does. */
export const dynamicParams = false;

export function generateStaticParams() {
  return UNITS.map((u) => ({ slug: u.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const u = unitById((await params).slug);
  if (!u) return {};
  return {
    title: u.name,
    description: u.line,
    /* A placeholder until the case is written; nothing here to index yet. */
    robots: { index: false },
  };
}

/**
 * One unit's page. For now a placeholder: the body large, the facts the map
 * already shows, and a note that the full case is on its way. The case will
 * follow the concept doc's shape (the situation, what was owned, the
 * trade-off, the impact) once Meet has settled what each one should show.
 */
export default async function WorkUnitPage({ params }: PageProps<"/work/[slug]">) {
  const u = unitById((await params).slug);
  if (!u) notFound();
  const kind = KINDS[u.kind];
  const colors = kindColors(u.kind);

  return (
    <PageTransition>
      <div className={plexVariables}>
        <PageNav />
        <main
          id="content"
          className={s.root}
          style={{ "--kind": colors[2], "--kind-soft": colors[3] } as CSSProperties}
        >
          <BodyPortrait id={u.id} kind={u.kind} className={s.canvas} />
          <div className={s.column}>
            <p className={s.kicker}>
              <span className={s.mark} aria-hidden>
                {kind.mark}
              </span>{" "}
              {kind.bodyName}, {kind.label.toLowerCase()}, {u.when}
            </p>
            <h1 className={s.title}>{u.name}</h1>
            <p className={s.lede}>{u.line}</p>
            <dl className={s.facts}>
              <div>
                <dt>owned</dt>
                <dd>{u.owned}</dd>
              </div>
              <div>
                <dt>result</dt>
                <dd className={s.result}>{u.result}</dd>
              </div>
            </dl>
            <p className={s.soon}>The full story is coming soon.</p>
            <nav className={s.links} aria-label="Next">
              {u.link && (
                <a href={u.link.href} target="_blank" rel="noreferrer">
                  {u.link.label}
                </a>
              )}
              {u.repo && (
                <a
                  href={u.repo}
                  target="_blank"
                  rel="noreferrer"
                  data-icon="github"
                  className={s.code}
                >
                  <WayMark icon="github" className={s.codeMark} />
                  See the code
                </a>
              )}
              <BackLink className={s.back} />
            </nav>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
