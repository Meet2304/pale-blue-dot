import type { ReactNode } from "react";

import { plexVariables } from "@/app/fonts";
import { Footer } from "@/components/universe/footer";
import { PageNav } from "@/components/universe/page-nav";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { StarField } from "@/components/site/star-field";

import s from "./record-page.module.css";

/**
 * A quiet reading page under the same sky as the story: a way back, one
 * column, the foot. About, the work list, the résumé and the record use it,
 * so a crawler gets real text instead of a redirect.
 */
export function RecordPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  return (
    <PageTransition>
      <div className={plexVariables}>
        <PageNav />
        <main id="content" className={s.root}>
          <StarField />
          <header className={s.top}>
            <BackLink className={s.back} />
          </header>
          <article className={s.page}>
            <h1 className={s.title}>{title}</h1>
            <p className={s.lede}>{lede}</p>
            {children}
          </article>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
