import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { plexVariables } from "@/app/fonts";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { StarField } from "@/components/site/star-field";
import { Footer } from "@/components/universe/footer";
import { lookColors, lookOf } from "@/components/universe/looks";
import { WorkMedia } from "@/components/universe/media";
import { PageNav } from "@/components/universe/page-nav";
import { WayMark } from "@/components/universe/way-mark";
import { KINDS } from "@/components/universe/encoding";
import { UNITS, unitById, type Unit } from "@/content/work";
import { routes } from "@/lib/routes";

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
  return { title: u.name, description: u.brief };
}

/**
 * One piece of work, told plainly, as the story page tells the photograph:
 * a quiet sky, a way back, and one column to read down. It is ordered for
 * a recruiter with a minute to spare, most important first: what it is, my
 * role, where it stands, where to see it (the site, the code) and what it
 * took, all before the first row; then what came of it and what I did.
 * Why it existed and a picture of it come last, for whoever reads on. Nothing waits to be scrolled to: the whole page is there at once.
 *
 * Colour is the piece's own, the colours its body is drawn in on the map.
 */
export default async function WorkUnitPage({ params }: PageProps<"/work/[slug]">) {
  const u = unitById((await params).slug);
  if (!u) notFound();
  const kind = KINDS[u.kind];
  const c = lookColors(lookOf(u.id, u.kind));
  const at = UNITS.indexOf(u);
  const prev = UNITS[at - 1];
  const next = UNITS[at + 1];

  return (
    <PageTransition>
      <div className={plexVariables}>
        <PageNav />
        <main
          id="content"
          className={s.root}
          style={{ "--kind": c[2], "--kind-soft": c[3] } as CSSProperties}
        >
          <StarField />
          <header className={s.top}>
            <BackLink className={s.back} />
          </header>

          <article className={s.page}>
            <header className={s.head}>
              <p className={s.kicker}>
                <span className={s.mark} aria-hidden>
                  {kind.mark}
                </span>{" "}
                {kind.label}
                <span className={s.sep} aria-hidden>
                  ·
                </span>
                {u.when}
              </p>
              <h1 className={s.title}>{u.name}</h1>
              {u.role && <p className={s.role}>{u.role}</p>}
              <p className={s.lede}>{u.line}</p>
              {/* Where to see it and where it stands, on one line: the
                  thing itself, its code, then its status. */}
              {(u.link || u.repo || !u.stats) && (
                <div className={s.actions}>
                  {u.link && (
                    <a
                      href={u.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={s.visit}
                      aria-label={`${u.link.verb ?? "Visit"} ${u.link.label}`}
                    >
                      {u.link.verb ? `${u.link.verb} ${u.link.label}` : u.link.label}
                      <span className={s.arrow} aria-hidden>
                        ↗
                      </span>
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
                      Code
                    </a>
                  )}
                  {!u.stats && <p className={s.status}>{u.result}</p>}
                </div>
              )}
              <ul className={s.skills} aria-label="Skills">
                {u.skills.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </header>

            {u.stats && (
              <Row label="Impact">
                <dl className={s.stats}>
                  {u.stats.map((st) => (
                    <div key={st.label}>
                      <dt>{st.label}</dt>
                      <dd>{st.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className={s.result}>{u.result}</p>
              </Row>
            )}

            <Row label="What I did">
              <ul className={s.did}>
                {u.did.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Row>

            <Row label="The aim">
              <p className={s.copy}>{u.aim}</p>
            </Row>

            {u.media && (
              <div className={s.media}>
                <WorkMedia media={u.media} />
              </div>
            )}

            <nav className={s.pager} aria-label="More work">
              {prev ? <Neighbour u={prev} dir="Previous" /> : <span />}
              {next && <Neighbour u={next} dir="Next" />}
            </nav>
          </article>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}

/** One part of the page: its name on the left, the part on the right. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={s.row}>
      <h2 className={s.label}>{label}</h2>
      <div>{children}</div>
    </section>
  );
}

/** The piece before or after this one, in the home page's order. */
function Neighbour({ u, dir }: { u: Unit; dir: "Previous" | "Next" }) {
  return (
    <Link href={`${routes.work}/${u.id}`} className={s.neighbour} data-dir={dir}>
      <span className={s.dir}>
        {dir === "Previous" && <span aria-hidden>← </span>}
        {dir}
        {dir === "Next" && <span aria-hidden> →</span>}
      </span>
      <span className={s.neighbourName}>{u.name}</span>
    </Link>
  );
}
