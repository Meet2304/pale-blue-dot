import s from "./universe.module.css";

/**
 * Meet's mark: "m." at rest, "meet." when the brand is pointed at or
 * focused. The pale blue dot is the full stop. Opening, it travels out to
 * the end of the word and draws the letters out behind it; closing, it
 * draws them back in.
 *
 * The letters are cut from the full wordmark (`public/logos/wordmark/`,
 * from `public/meet_logo_full_dark_v0.1.png`), so the "m" is the same in
 * both states, and used as masks, so they take the text colour: white on
 * this dark page, black on a light one. The dot is the logo's own blue. The
 * mark is as wide as the whole word even when closed, so nothing beside it
 * moves when it opens.
 */
export function Logo() {
  return (
    <span className={s.logo} aria-hidden>
      <span className={s.logoM} />
      <span className={s.logoEet}>
        <span />
      </span>
      <span className={s.logoDot} />
    </span>
  );
}
