import s from "./resume-mark.module.css";

/**
 * The resume's mark, the same wherever it is (the foot of every page, the
 * contact page): a page, which lifts and writes its lines in when its link
 * is pointed at or focused.
 */
export function ResumeMark({ className }: { className?: string }) {
  return (
    <svg
      className={`${s.mark} ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6.5 3h8l4 4v14h-12z" />
      <path d="M14.5 3v4h4" />
      <path className={s.line} d="M9 11h6.5" />
      <path className={s.line} d="M9 14h6.5" />
      <path className={s.line} d="M9 17h4" />
    </svg>
  );
}
