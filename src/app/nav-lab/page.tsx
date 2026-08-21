import type { Metadata } from "next";

import { NavLabGallery } from "@/components/site/nav-lab/gallery";

export const metadata: Metadata = {
  title: "Nav lab",
  description: "Six experimental mobile navigation designs for The Pale Blue Dot.",
  robots: { index: false, follow: false },
};

export default function NavLabPage() {
  return <NavLabGallery />;
}
