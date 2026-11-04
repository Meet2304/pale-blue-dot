import type { ReactNode } from "react";

import { KINDS } from "@/components/universe/encoding";
import { WayMark } from "@/components/universe/way-mark";
import type { AwardStory, Unit } from "@/content/work";

import { CallFlow } from "./call-flow";
import { Countdown } from "./clock";
import { Journey } from "./journey";
import { Nova } from "./nova";
import { People } from "./people";
import { PlatformLinks } from "./platforms";
import { Prints } from "./prints";
import { Steps } from "./steps";
import a from "./award.module.css";
import j from "./journey.module.css";
import w from "./work.module.css";

/**
 * An award's own page, across the full width of the screen, as every page
 * is. Behind it, the award's supernova, large and faded, held in the
 * screen's top corner as the page scrolls over it, part of the sky, going
 * off now and then (nova.tsx). Beside everything, a side column
 * with the page's index (steps.tsx), which stays on screen through every
 * part. Beside that, the content:
 *
 *   - the head: a title, a paragraph and the achievement in one
 *     photograph;
 *   - how it works, shown by a short animation of a call (call-flow.tsx);
 *   - my part;
 *   - the journey: the days, from the first hour of the hackathon to the
 *     way home, with their photographs, the people in them, and on the day
 *     of the wins, the posts they were announced in; the globe beside
 *     them, quieter, as their setting (journey.tsx);
 *   - the people, side by side, each with their face and their LinkedIn
 *     (people.tsx).
 */
export function AwardBody({
  u,
  story,
  colors,
  pager,
}: {
  u: Unit;
  story: AwardStory;
  /** The award's colours, as its body is drawn (looks.ts). */
  colors: string[];
  pager: ReactNode;
}) {
  const kind = KINDS[u.kind];
  const flight = story.days.flight;
  const parts = [
    { id: "how", label: "How it works" },
    { id: "part", label: "My part" },
    ...(flight ? [{ id: "journey", label: "The journey" }] : []),
    ...(story.people ? [{ id: "people", label: "The people" }] : []),
  ];
  const talk = story.days.stops.find((st) => st.title === "On stage");
  const names = Object.fromEntries((story.people ?? []).map((p) => [p.id, p.name]));

  return (
    <>
      {/* Fixed behind the page, so outside the article, whose arrival
          animation would otherwise carry it along. */}
      <Nova colors={colors} />
      <article className={a.page}>
        <aside className={a.side}>
          <Steps parts={parts} />
        </aside>

        <header className={a.head}>
          <div className={a.headText}>
            <p className={w.kicker}>
              <span className={w.mark} aria-hidden>
                {kind.mark}
              </span>{" "}
              Awards
              <span className={w.sep} aria-hidden>
                ·
              </span>
              October 2026
            </p>
            <h1 className={a.title}>{story.title}</h1>
            <p className={a.intro}>{story.intro}</p>
            <p className={a.links}>
              <a href={story.project.href} target="_blank" rel="noreferrer">
                {story.project.name} ↗
              </a>
              {story.project.repo && (
                <a
                  href={story.project.repo}
                  target="_blank"
                  rel="noreferrer"
                  data-icon="github"
                >
                  <WayMark icon="github" className={w.codeMark} />
                  Code
                </a>
              )}
            </p>
          </div>
          {story.hero && (
            <figure className={a.hero}>
              <Prints
                photos={[story.hero]}
                shown
                first
                names={names}
                sizes="(max-width: 640px) 100vw, (max-width: 1000px) 92vw, 40rem"
                className={j.single}
              />
              <figcaption className={a.heroCaption}>
                {talk?.at && (
                  <span className={a.talk}>
                    <span className={a.dot} aria-hidden />
                    <Countdown
                      at={talk.at}
                      before="On stage in Seoul"
                      after={`Spoke in Seoul, ${talk.when}`}
                    />
                  </span>
                )}
                <span>{story.hero.caption}</span>
              </figcaption>
            </figure>
          )}
        </header>

        <div className={a.main}>
          <Part id="how" title="How it works">
            <p className={a.p}>{story.how.line}</p>
            <CallFlow steps={story.how.steps} label="Steps of a call" />
          </Part>

          <Part id="part" title="My part">
            <p className={a.p}>
              On the team I was <b>{story.role.title}</b>. I built:
            </p>
            <ul className={`${a.list} ${a.spread}`}>
              {story.role.built.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <ul className={w.skills} aria-label="Skills">
              {u.skills.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p className={a.note}>{story.role.with}</p>
          </Part>

          {flight && (
            <section id="journey" className={j.section} aria-labelledby="journey-title">
              <header className={j.head}>
                <p className={j.kicker}>
                  <span className={j.kickerMark} aria-hidden>
                    {kind.mark}
                  </span>
                  Pittsburgh → Seoul
                </p>
                <h2 id="journey-title" className={j.h2}>
                  The journey
                </h2>
                {story.days.line && <p className={j.lede}>{story.days.line}</p>}
              </header>
              <Journey
                stops={story.days.stops}
                flight={flight}
                colors={colors}
                people={story.people ?? []}
                posts={<Posts wins={story.wins} />}
              />
            </section>
          )}

          {story.people && (
            <section
              id="people"
              className={j.peoplePart}
              aria-labelledby="people-title"
            >
              <h2 id="people-title" className={j.h2}>
                The people
              </h2>
              <p className={j.lede}>
                The team I went with, the other winners, and the people I met at the
                summit.
              </p>
              <People people={story.people} stops={story.days.stops} />
            </section>
          )}
        </div>
      </article>

      <div className={a.pager}>{pager}</div>
    </>
  );
}

/**
 * The wins as they were announced: each announcement's own card, who gave
 * it and when, what it is, a line on it, and the post on each platform it
 * was made on (platforms.tsx). Shown with the day of the wins.
 */
function Posts({ wins }: { wins: AwardStory["wins"] }) {
  return (
    <div className={a.wins}>
      {wins.map((win) => (
        <div key={win.by} className={a.win}>
          <a
            href={win.links[0].href}
            target="_blank"
            rel="noreferrer"
            className={a.winImage}
            tabIndex={-1}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served as is, as every picture on the site is (picture.tsx) */}
            <img
              src={win.image.src}
              width={win.image.width}
              height={win.image.height}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </a>
          <span className={a.winBy}>
            {win.by} · {win.date}
          </span>
          <span className={a.winTitle}>{win.title}</span>
          <span className={a.winEvent}>{win.event}</span>
          <span className={a.winLine}>{win.line}</span>
          <PlatformLinks links={win.links} by={win.by} />
        </div>
      ))}
    </div>
  );
}

/** One part: a plain heading over it, and an anchor for the rail. */
function Part({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={a.part} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={a.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}
