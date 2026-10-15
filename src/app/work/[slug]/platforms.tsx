import a from "./award.module.css";

/**
 * Where a win was announced, a link per platform, each with its logo (from
 * svglogos.dev, drawn inline so it can take the page's colours). At rest
 * the logos are quiet, in the text's grey; pointed at, one pops up a
 * little and takes its own colour, its arrow lifts, and a line draws in
 * under its name (award.module.css).
 */

export type Platform = "linkedin" | "x";

const NAMES: Record<Platform, string> = { linkedin: "LinkedIn", x: "X" };

export function PlatformLinks({
  links,
  by,
}: {
  links: { platform: Platform; href: string }[];
  /** Who posted it, for the links' accessible names. */
  by: string;
}) {
  return (
    <ul className={a.platforms} aria-label={`${by}'s announcement`}>
      {links.map((l) => (
        <li key={l.platform}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className={a.platform}
            data-platform={l.platform}
            aria-label={`${by} on ${NAMES[l.platform]}`}
          >
            <PlatformIcon platform={l.platform} />
            <span className={a.platformName}>{NAMES[l.platform]}</span>
            <span className={a.platformArrow} aria-hidden>
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function PlatformIcon({ platform }: { platform: Platform }) {
  return platform === "linkedin" ? (
    <svg className={a.platformIcon} viewBox="0 0 256 256" aria-hidden>
      <path
        fill="currentColor"
        d="M218.123122,218.127392 L180.191928,218.127392 L180.191928,158.724263 C180.191928,144.559023 179.939053,126.323993 160.463756,126.323993 C140.707926,126.323993 137.685284,141.757585 137.685284,157.692986 L137.685284,218.123441 L99.7540894,218.123441 L99.7540894,95.9665207 L136.168036,95.9665207 L136.168036,112.660562 L136.677736,112.660562 C144.102746,99.9650027 157.908637,92.3824528 172.605689,92.9280076 C211.050535,92.9280076 218.138927,118.216023 218.138927,151.114151 L218.123122,218.127392 Z M56.9550587,79.2685282 C44.7981969,79.2707099 34.9413443,69.4171797 34.9391618,57.260052 C34.93698,45.1029244 44.7902948,35.2458562 56.9471566,35.2436736 C69.1040185,35.2414916 78.9608713,45.0950217 78.963054,57.2521493 C78.9641017,63.090208 76.6459976,68.6895714 72.5186979,72.8184433 C68.3913982,76.9473153 62.7929898,79.26748 56.9550587,79.2685282 M75.9206558,218.127392 L37.94995,218.127392 L37.94995,95.9665207 L75.9206558,95.9665207 L75.9206558,218.127392 Z M237.033403,0.0182577091 L18.8895249,0.0182577091 C8.57959469,-0.0980923971 0.124827038,8.16056231 -0.001,18.4706066 L-0.001,237.524091 C0.120519052,247.839103 8.57460631,256.105934 18.8895249,255.9977 L237.033403,255.9977 C247.368728,256.125818 255.855922,247.859464 255.999,237.524091 L255.999,18.4548016 C255.851624,8.12438979 247.363742,-0.133792868 237.033403,0.000790807055"
      />
    </svg>
  ) : (
    <svg className={a.platformIcon} viewBox="0 0 251 256" aria-hidden>
      <path
        fill="currentColor"
        d="M149.078767,108.398529 L242.331303,0 L220.233437,0 L139.262272,94.1209195 L74.5908396,0 L0,0 L97.7958952,142.3275 L0,256 L22.0991185,256 L107.606755,156.605109 L175.904525,256 L250.495364,256 L149.07334,108.398529 L149.078767,108.398529 Z M118.810995,143.581438 L108.902233,129.408828 L30.0617399,16.6358981 L64.0046968,16.6358981 L127.629893,107.647252 L137.538655,121.819862 L220.243874,240.120681 L186.300917,240.120681 L118.810995,143.586865 L118.810995,143.581438 Z"
      />
    </svg>
  );
}
