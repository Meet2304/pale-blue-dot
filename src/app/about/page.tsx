import Link from "next/link";

import { RecordPage } from "@/components/site/record-page";
import s from "@/components/site/record-page.module.css";
import { unitById } from "@/content/work";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

const cmu = unitById("carnegie-mellon");
const pdeu = unitById("pdeu");

export const metadata = pageMetadata("/about", {
  title: "About",
  description:
    "Meet Bhatt is an AI engineer and product builder, a J N Tata Scholar at Carnegie Mellon University.",
});

export default function AboutPage() {
  return (
    <RecordPage
      title="Meet Bhatt"
      lede="I am an engineer. This pale blue dot is where I build things."
    >
      {cmu && (
        <p>
          {cmu.brief} {cmu.when}.
        </p>
      )}
      {pdeu && <p>{pdeu.brief}</p>}
      <ul className={s.links}>
        <li>
          <Link href={routes.story}>The story</Link>
        </li>
        <li>
          <Link href={routes.work}>The work</Link>
        </li>
        <li>
          <Link href={routes.changelog}>In order</Link>
        </li>
        <li>
          <Link href={routes.resume}>Résumé</Link>
        </li>
        <li>
          <Link href={routes.contact}>Say hello</Link>
        </li>
      </ul>
    </RecordPage>
  );
}
