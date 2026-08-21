import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What changed on this site, in the order it happened.",
};

export default function ChangelogPage() {
  return (
    <ComingSoon
      eyebrow="Changelog"
      title={
        <>
          What changed, <em>in order</em>
        </>
      }
      note="A dated log of the site itself is going here — not a dump of commits, a short record of what you would actually notice. Until then the work is the site in front of you."
    />
  );
}
