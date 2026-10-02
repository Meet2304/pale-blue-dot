import Link from "next/link";

import { plexVariables } from "@/app/fonts";
import { Footer } from "@/components/universe/footer";
import { PageNav } from "@/components/universe/page-nav";
import { routes } from "@/lib/routes";

import s from "./not-found.module.css";

/* A page that is not here: said plainly, in the Terminal system, with the
   way home. */
export default function NotFound() {
  return (
    <div className={plexVariables}>
      <PageNav />
      <main id="content" className={s.root}>
        <p className={s.kicker}>404</p>
        <h1 className={s.title}>Lost in space.</h1>
        <p className={s.lede}>There is nothing at this address.</p>
        <Link href={routes.home} className={s.home}>
          Back to Earth
        </Link>
      </main>
      <Footer />
    </div>
  );
}
