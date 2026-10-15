import type { ReactNode } from "react";

import { KINDS } from "@/components/universe/encoding";
import { WayMark } from "@/components/universe/way-mark";
import type { AwardStory, Unit } from "@/content/work";

import { CallFlow } from "./call-flow";
import { Countdown, Until } from "./clock";
import { Journey } from "./journey";
import { PlatformLinks } from "./platforms";
import { Steps } from "./steps";
import a from "./award.module.css";
import w from "./work.module.css";

/**
 * An award's own page, written to be read like a short article: a title, a
 * paragraph, then each win side by side with its announcement. Below them,
 * how it works, shown by a short animation of a call (call-flow.tsx) with a
 * line above it and a few bullets under it; my part; and the journey to
 * Seoul on the globe. A rail beside the column (steps.tsx) jumps between
 * the parts.
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
  const parts = [
    { id: "wins", label: "The wins" },
    { id: "how", label: "How it works" },
    { id: "part", label: "My part" },
    { id: "journey", label: "The journey" },
  ];
  const talk = story.days.stops.find((st) => st.title === "On stage");

  return (
    <article className={a.page}>
      <header className={a.head}>
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
      </header>

      <div className={a.body}>
        <Steps parts={parts} />

        <div className={a.parts}>
          <Part id="wins" title="The wins">
            <div className={a.wins}>
              {story.wins.map((win) => (
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
          </Part>

          <Part id="how" title="How it works">
            <p className={a.p}>{story.how.line}</p>
            <CallFlow steps={story.how.steps} label="Steps of a call" />
            <ul className={a.list}>
              {story.how.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </Part>

          <Part id="part" title="My part">
            <p className={a.p}>
              On the team I was <b>{story.role.title}</b>. I built:
            </p>
            <ul className={a.list}>
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

          <Part id="journey" title="The journey" wide={!!story.days.flight}>
            {talk && (
              <p className={a.talk}>
                <span className={a.dot} aria-hidden />
                <Countdown
                  at={talk.at}
                  before="On stage in Seoul"
                  after={`Spoke in Seoul, ${talk.when}`}
                />
              </p>
            )}
            {story.days.flight && (
              <Journey
                stops={story.days.stops}
                flight={story.days.flight}
                colors={colors}
              />
            )}
            {story.photo && (
              <figure className={a.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served as is, as every picture on the site is (picture.tsx) */}
                <img
                  src={story.photo.src}
                  srcSet={`${story.photo.src.replace(/\.webp$/, "-sm.webp")} ${story.photo.width / 2}w, ${story.photo.src} ${story.photo.width}w`}
                  sizes="(max-width: 860px) 100vw, 42rem"
                  width={story.photo.width}
                  height={story.photo.height}
                  alt={story.photo.alt}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>{story.photo.caption}</figcaption>
              </figure>
            )}
            {story.soon && (
              <Until until={story.soon.until}>
                <p className={a.note}>
                  <span aria-hidden>◌</span> Pictures from {story.soon.label} to come.
                </p>
              </Until>
            )}
          </Part>

          <div className={a.pager}>{pager}</div>
        </div>
      </div>
    </article>
  );
}

/** One part: a plain heading over it, and an anchor for the rail. */
function Part({
  id,
  title,
  wide,
  children,
}: {
  id: string;
  title: string;
  /** Runs past the column, for the globe. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={a.part}
      data-wide={wide || undefined}
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className={a.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}
