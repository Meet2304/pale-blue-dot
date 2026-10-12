import Link from "next/link";

import { RecordPage } from "@/components/site/record-page";
import s from "@/components/site/record-page.module.css";
import { CONTACT, UNITS } from "@/content/work";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/resume", {
  title: "Resume",
  description: "Meet Bhatt's résumé: the work, the roles, and the PDF.",
});

export default function ResumePage() {
  return (
    <RecordPage title="Résumé" lede="The file, and the same record on this page.">
      <p>
        <a href={CONTACT.resume}>Open the PDF</a>
      </p>
      <ul className={s.entries}>
        {UNITS.map((u) => (
          <li key={u.id}>
            <Link href={`${routes.work}/${u.id}`}>
              <span className={s.name}>{u.name}</span>
              <span className={s.meta}>
                {u.role ? `${u.role} · ` : ""}
                {u.when}
              </span>
              <span className={s.line}>{u.result}</span>
            </Link>
          </li>
        ))}
      </ul>
    </RecordPage>
  );
}
