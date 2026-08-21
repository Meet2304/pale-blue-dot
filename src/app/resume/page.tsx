import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Resume",
  description: "Meet Bhatt's resume.",
};

export default function ResumePage() {
  return (
    <ComingSoon
      eyebrow="Resume"
      title={
        <>
          Not quite <em>ready to hand over</em>
        </>
      }
      note="The download will point at a real file the moment there is one worth downloading. Pointing it at a missing file in the meantime would just have failed silently."
    />
  );
}
