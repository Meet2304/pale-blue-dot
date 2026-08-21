import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected projects, told as decisions rather than as a list.",
};

export default function WorkPage() {
  return (
    <ComingSoon
      eyebrow="Work"
      title={
        <>
          One project <em>at a time</em>
        </>
      }
      note="Each piece of work gets the same shape here: what the situation was, what I chose to take on, and what it changed about how I work. That takes longer to write than a list does."
    />
  );
}
