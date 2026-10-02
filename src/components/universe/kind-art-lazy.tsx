"use client";

import dynamic from "next/dynamic";

import s from "./universe.module.css";

/* The kinds' bodies (kind-art.tsx), loaded on their own: an empty frame of
   the same size holds their place until they arrive. */
export const loadKindArt = () => import("./kind-art");

export const KindViewer = dynamic(() => loadKindArt().then((m) => m.KindViewer), {
  ssr: false,
  loading: () => <div className={s.viewer} />,
});

export const KindThumb = dynamic(() => loadKindArt().then((m) => m.KindThumb), {
  ssr: false,
  loading: () => <canvas className={s.thumb} aria-hidden />,
});
