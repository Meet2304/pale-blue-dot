import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "About",
  description: "Who Meet Bhatt is, and what he keeps choosing to take on.",
};

export default function AboutPage() {
  return (
    <ComingSoon
      eyebrow="About"
      title={
        <>
          Still deciding <em>what is worth saying</em>
        </>
      }
      note="This page is going to be written rather than assembled, which is why it isn't here yet. The short version is in the hero, and the honest version is on the Story page."
    />
  );
}
