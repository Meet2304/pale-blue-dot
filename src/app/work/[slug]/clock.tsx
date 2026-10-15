"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Words that depend on the visitor's day, which the server can't know: the
 * page is rendered with what is true before `at`, and the clock settles it
 * once the page is running.
 */

/** `before`, and how long until `at`, in days or hours; or `after` once it
    has passed. Nothing until the clock is known. */
export function Countdown({
  at,
  before,
  after,
}: {
  at: string;
  before: string;
  after: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's clock, which the server can't know
    setNow(Date.now());
  }, []);
  if (now === null) return null;
  const left = Date.parse(at) - now;
  if (left <= 0) return <>{after}</>;
  const days = Math.floor(left / 864e5);
  const hours = Math.floor(left / 36e5) % 24;
  return (
    <>
      {before} {days > 0 ? `in ${days} day${days > 1 ? "s" : ""}` : `in ${hours} h`}
    </>
  );
}

/** Its children until `until`, then nothing. */
export function Until({ until, children }: { until: string; children: ReactNode }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's clock, which the server can't know
    setGone(Date.now() >= Date.parse(until));
  }, [until]);
  return gone ? null : <>{children}</>;
}
