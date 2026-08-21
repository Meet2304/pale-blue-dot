import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Meet Bhatt.",
};

export default function ContactPage() {
  return (
    <ComingSoon
      eyebrow="Contact"
      title={
        <>
          Reachable, <em>shortly</em>
        </>
      }
      note="A real way to get in touch is going here — not a form that disappears into nothing. Until then, the address in the footer of any email I have sent you still works."
    />
  );
}
