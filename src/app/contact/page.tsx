import type { Metadata } from "next";
import { plexVariables } from "@/app/fonts";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { CopyEmail } from "@/components/universe/copy-email";
import { Footer } from "@/components/universe/footer";
import { CONTACT } from "@/content/work";
import { SOCIAL_LINKS } from "@/lib/socials";

import s from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Meet Bhatt: email, LinkedIn, GitHub and X.",
};

/* Each profile's mark, from svglogos.dev (public/logos/social/). */
const MARKS: Record<(typeof SOCIAL_LINKS)[number]["id"], string> = {
  github: "/logos/social/github-icon.svg",
  linkedin: "/logos/social/linkedin-icon.svg",
  x: "/logos/social/x.svg",
};

/**
 * The contact page, simple for now (a fuller design is to come): where to
 * write, and where else Meet is, in the home page's own type, over a dark
 * sky with the pale blue dot in it.
 */
export default function ContactPage() {
  return (
    <PageTransition>
      <div className={plexVariables}>
        <main id="content" className={s.root}>
          <span className={s.dot} aria-hidden />
          <header className={s.top}>
            <BackLink className={s.home}>
              <span aria-hidden>←</span> Back to the universe
            </BackLink>
          </header>

          <section className={s.body}>
            <p className={s.kicker}>Contact</p>
            <h1 className={s.title}>Say hello.</h1>
            <p className={s.lede}>
              Questions, ideas, or work you think I&apos;d care about: write to me. I
              read everything.
            </p>

            <div className={s.email}>
              <CopyEmail
                email={CONTACT.email}
                className={s.address}
                buttonClassName={s.copy}
              />
            </div>

            <ul className={s.links}>
              {SOCIAL_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={l.href} target="_blank" rel="noreferrer" data-id={l.id}>
                    <span
                      className={s.icon}
                      style={{ maskImage: `url(${MARKS[l.id]})` }}
                      aria-hidden
                    />
                    {l.label}
                    <span className={s.arrow} aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              ))}
              <li>
                <a href={CONTACT.resume} target="_blank" rel="noreferrer">
                  <span className={s.glyph} aria-hidden>
                    ≡
                  </span>
                  Resume
                  <span className={s.arrow} aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            </ul>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
