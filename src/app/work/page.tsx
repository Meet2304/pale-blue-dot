import Link from "next/link";

import { RecordPage } from "@/components/site/record-page";
import s from "@/components/site/record-page.module.css";
import { COLLECTIONS } from "@/content/work";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/work", {
  title: "Work",
  description:
    "Meet Bhatt's work, newest first: school, research, products, and the teams he led.",
});

export default function WorkPage() {
  return (
    <RecordPage title="The work" lede="Newest first. Each one has its own page.">
      {COLLECTIONS.map((col) => (
        <section key={col.id} className={s.group}>
          <h2>
            {col.title}
            {col.title !== col.span ? `, ${col.span}` : ""}
          </h2>
          <ul className={s.entries}>
            {col.units.map((u) => (
              <li key={u.id}>
                <Link href={`${routes.work}/${u.id}`}>
                  <span className={s.name}>{u.name}</span>
                  <span className={s.meta}>
                    {u.role ? `${u.role} · ` : ""}
                    {u.when}
                  </span>
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
