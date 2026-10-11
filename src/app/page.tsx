import { PageTransition } from "@/components/site/page-transition";
import { ProfileJsonLd } from "@/components/site/structured-data";
import { Universe } from "@/components/universe/universe";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";

import { plexVariables } from "./fonts";

export const metadata = pageMetadata("/", {
  title: {
    absolute:
      "Meet Bhatt — I am an Engineer. This pale blue dot is where I build things.",
  },
  description: SITE_DESCRIPTION,
});

/**
 * The universe: Earth up close, then the whole map around the pale blue dot,
 * then each year in turn, newest first. The spec is
 * `plans/celestial-portfolio-handoff.md` on the `play` branch.
 */
export default function Home() {
  return (
    <PageTransition universe>
      <ProfileJsonLd />
      <div className={plexVariables}>
        <Universe />
      </div>
    </PageTransition>
  );
}
