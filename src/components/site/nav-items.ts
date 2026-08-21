"use client";

import type { ComponentType } from "react";

import { Compass } from "@/components/animate-ui/icons/compass";
import { Layers } from "@/components/animate-ui/icons/layers";
import { Send } from "@/components/animate-ui/icons/send";
import { User } from "@/components/animate-ui/icons/user";

/** The one shape every Animate UI icon satisfies; the rest of their props are optional. */
export type NavIcon = ComponentType<{ className?: string; size?: number }>;

export type NavItem = {
  href: string;
  label: string;
  Icon: NavIcon;
};

/**
 * The site's whole internal link graph, in four single words.
 *
 * Single words because the bar is a tool, not a statement — "Story" rather than
 * "The Note", "Work" rather than "Selected Projects". Compass for the story
 * page: it is the page about direction, and the star was already spoken for
 * (in this project's vocabulary a star is a piece of work).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/about", label: "About", Icon: User },
  { href: "/work", label: "Work", Icon: Layers },
  { href: "/story", label: "Story", Icon: Compass },
  { href: "/contact", label: "Contact", Icon: Send },
];

/**
 * Flip this — and drop the file at `public/resume.pdf` — when the resume is
 * ready, then delete `src/app/resume/page.tsx`. Until then the control points
 * at a real route rather than at a missing file: an `<a download>` aimed at a
 * 404 navigates away silently, which is a worse failure than an honest page.
 */
export const RESUME_READY = false;
export const RESUME_HREF = RESUME_READY ? "/resume.pdf" : "/resume";
