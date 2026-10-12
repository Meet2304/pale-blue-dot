import Link from "next/link";

import { RecordPage } from "@/components/site/record-page";
import s from "@/components/site/record-page.module.css";
import { COLLECTIONS } from "@/content/work";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/changelog", {
  title: "Changelog",
  description:
    "Meet Bhatt's work in the order it happened, from the first piece to now.",
});

/** Oldest first: the home page and /work run the other way, inside each year too. */
const CHRONICLE = [...COLLECTIONS].reverse().map((col) => ({
  ...col,
  units: [...col.units].reverse(),
}));

export default function ChangelogPage() {
  return (
    <RecordPage
      title="In order"
      lede="From the first piece to the latest. The site is that record."
    >
      {CHRONICLE.map((col) => (
        <section key={col.id} className={s.group}>
          <h2>{col.span}</h2>
          <ul className={s.entries}>
            {col.units.map((u) => (
              <li key={u.id}>
                <Link href={`${routes.work}/${u.id}`}>
                  <span className={s.name}>{u.name}</span>
                  <span className={s.meta}>{u.when}</span>
                  <span className={s.line}>{u.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </RecordPage>
  );
}
