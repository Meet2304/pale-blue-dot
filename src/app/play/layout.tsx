import Link from "next/link";

import styles from "./play.module.css";

/**
 * The play ground. Every concept below brings its own world, so the site's
 * nav, footer and star field stand down on these routes (see SiteChrome and
 * SiteFooter). The only shared furniture is a way back to the list.
 */
export default function PlayLayout({ children }: LayoutProps<"/play">) {
  return (
    <>
      {children}
      <Link href="/play" className={styles.back}>
        All concepts
      </Link>
    </>
  );
}
