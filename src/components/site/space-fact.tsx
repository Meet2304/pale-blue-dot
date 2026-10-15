"use client";

import { useSyncExternalStore } from "react";

/* Short, true, and a little surprising. */
const FACTS = [
  "A day on Venus is longer than its year. It turns once every 243 Earth days, and goes round the Sun in 225.",
  "A teaspoon of neutron star would weigh about a billion tonnes on Earth.",
  "Saturn is less dense than water. In a bath big enough, it would float.",
  "The footprints on the Moon could last millions of years. There's no wind or rain to wipe them away.",
  "Sunlight takes about 8 minutes and 20 seconds to reach you. You always see the Sun as it was.",
  "The space station goes round Earth every 90 minutes or so, so its crew sees about 16 sunrises a day.",
  "About a million Earths would fit inside the Sun.",
  "A message to Voyager 1 now takes nearly a whole day to arrive, at the speed of light.",
  "The fastest-spinning star we know of turns 716 times a second.",
  "The black hole in the Perseus galaxy cluster hums a B flat, about 57 octaves below middle C.",
  "Olympus Mons, a volcano on Mars, is about two and a half times as tall as Everest.",
  "Without gravity, a candle flame isn't a teardrop. It's a dim blue ball.",
  "The light from the Andromeda galaxy that reaches your eye tonight set off about 2.5 million years ago.",
];

/* One fact per page load, chosen in the browser: the server can't know
   which, so it sends none, and the line fills in as the page wakes. */
let picked = -1;
const pick = () => {
  if (picked < 0) picked = Math.floor(Math.random() * FACTS.length);
  return picked;
};
const unsubscribe = () => {};
const subscribe = () => unsubscribe;

/** A random fact about space, for a page that has nothing else to give. */
export function SpaceFact({ className }: { className?: string }) {
  const i = useSyncExternalStore(subscribe, pick, () => -1);
  return <p className={className}>{i < 0 ? " " : FACTS[i]}</p>;
}
