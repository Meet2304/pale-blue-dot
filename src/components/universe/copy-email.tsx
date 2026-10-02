"use client";

import { useState } from "react";

/**
 * The address, as a mail link, with a button that copies it: for anyone
 * whose computer has no mail app set up, which is most people's.
 */
export function CopyEmail({
  email,
  className,
  buttonClassName,
}: {
  email: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* No clipboard (an insecure page, or refused): the link still works. */
    }
  };

  return (
    <>
      <a className={className} href={`mailto:${email}`}>
        {email}
      </a>
      <button type="button" className={buttonClassName} onClick={copy}>
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </>
  );
}
