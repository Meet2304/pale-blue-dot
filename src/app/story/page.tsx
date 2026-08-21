import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Story",
  description: "Why this site exists, in plain language.",
};

export default function StoryPage() {
  return (
    <ComingSoon
      eyebrow="Story"
      title={
        <>
          The one page that <em>explains itself</em>
        </>
      }
      note="Everywhere else on this site the idea is meant to be felt rather than stated. This is the deliberate exception — a short note about the photograph, and about wanting to add something to it."
    />
  );
}
