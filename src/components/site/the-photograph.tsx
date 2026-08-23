"use client";

import { useCallback, useId, useState, useRef } from "react";
import Image from "next/image";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { X } from "@/components/animate-ui/icons/x";

const PHOTO = {
  src: "/pale-blue-dot.jpg",
  width: 1024,
  height: 768,
  alt: "Voyager 1’s photograph of Earth: a single pale point of light in a band of sunlight, against the dark of space.",
} as const;

/**
 * The photograph at the top of the Note.
 *
 * Cropped to 16:9 on the page so it does not eat the night. The plate is a
 * button because the only thing it does is open a closer look — a dialog,
 * the platform’s own, so escape, focus and the backdrop come free. The full
 * 4:3 still waits in there.
 *
 * The still is faded in once it has decoded, so a slow fetch shows the
 * plate as a skeleton rather than as an empty black hole that then pops.
 */
export function ThePhotograph() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const show = useCallback(() => {
    dialogRef.current?.showModal();
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  return (
    <>
      <figure className="hz-note-sky">
        <button
          type="button"
          className="hz-note-frame hz-rise"
          style={{ ["--hz-dur" as string]: "var(--dur-cinematic)" }}
          data-ready={ready ? "true" : "false"}
          onClick={show}
          aria-haspopup="dialog"
          aria-controls={titleId}
          aria-expanded={open}
          aria-label="Look more closely at the Pale Blue Dot photograph"
        >
          <span className="hz-note-mat">
            <Image
              src={PHOTO.src}
              alt={PHOTO.alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) calc(100vw - 48px), 44rem"
              className="hz-note-shot"
              onLoad={() => setReady(true)}
            />
          </span>
        </button>
      </figure>

      <dialog
        ref={dialogRef}
        id={titleId}
        className="hz-note-lightbox"
        aria-label="The Pale Blue Dot"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) hide();
        }}
      >
        <form method="dialog" className="hz-note-lightbox-bar">
          <AnimateIcon asChild animateOnHover animateOnTap>
            <button type="submit" className="hz-note-lightbox-close" aria-label="Close">
              <X size={22} />
            </button>
          </AnimateIcon>
        </form>
        <Image
          src={PHOTO.src}
          alt={PHOTO.alt}
          width={PHOTO.width}
          height={PHOTO.height}
          sizes="96vw"
          className="hz-note-lightbox-shot"
        />
      </dialog>
    </>
  );
}
