/**
 * Shown while the Story route's RSC payload is still on the wire.
 *
 * Same sky and letter proportions as the real page, so a slow connection
 * holds a quiet shape rather than a blank night that then jumps. The pulse
 * is the same skeleton the photograph uses while the still is decoding.
 */
export default function StoryLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="hz-note-sr">Loading the story</p>
      <div className="hz-note-sky">
        <div
          className="hz-note-frame hz-note-skel-plate"
          data-ready="false"
          aria-hidden="true"
        >
          <span className="hz-note-mat" />
        </div>
      </div>
      <div className="hz-note-letter" aria-hidden="true">
        <span className="hz-skel hz-note-skel" style={{ width: "94%" }} />
        <span className="hz-skel hz-note-skel" style={{ width: "86%" }} />
        <span className="hz-skel hz-note-skel" style={{ width: "90%" }} />
        <span
          className="hz-skel hz-note-skel"
          style={{ width: "42%", marginTop: "1.75em" }}
        />
        <span
          className="hz-skel hz-note-skel"
          style={{ width: "91%", marginTop: "1.75em" }}
        />
        <span className="hz-skel hz-note-skel" style={{ width: "78%" }} />
      </div>
    </div>
  );
}
