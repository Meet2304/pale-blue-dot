# Hero: the greeting, and a new line

- **Date:** 28 September 2026
- **Branch:** `claude/eager-ramanujan-blh51w`
- **Why:** Visitors could not tell whose site this was. Meet asked for an opening that
  says "Hola! I'm Meet" and hands over to the landing page with that text still in view,
  and for a hero line that belongs to this site better than "What's missing, I make."

## The opening (`src/components/universe/intro.tsx`)

It is paced like someone speaking:

1. Black, and nothing on it for half a second.
2. "Hola!", on its own, decoding out of the terminal's light glyphs.
3. A pause of about a second, the breath before saying who you are.
4. "I'm Meet", word after word at the pace of speech. The full stop lights last, in pale
   blue with a soft glow: the pale blue dot arrives as the end of the sentence.
5. After a breath (0.75 s), the line that says what that dot is, beneath the greeting,
   decoded and ticking the same way, a little quicker: **"This pale blue dot is where
   I build things."** It is the hero's headline, set in the headline's type, on one
   line, left-aligned with the greeting (added 29 September; see below).
6. A hold of 1.3 s, then one move of 1.5 s: the greeting shrinks into its place in the
   hero, and the second line breaks into the headline's lines and grows into it, every
   line flying straight to its place, all together. As they leave, the black lifts away
   in under half a second, and Earth, still a single pale blue point of light, grows
   into the terminal Earth on the same curve, landing as the lines do (29 September;
   see below). The identity line, bar and chapter ticks rise in as the lines slow into
   place.

About 8 seconds from the first frame. Any key, click, tap or scroll skips straight to
the flight, and nothing scrolls until it has landed. It plays on every fresh load, not
again when a visitor comes back to `/` from another page in the same visit. Under
reduced motion each word appears whole on the same beats, and the black fades away over
a greeting that is already in place.

### A line that becomes the headline (29 September)

On its own, "Adding light to the pale blue dot." assumed visitors knew the reference
(Voyager 1's photograph of Earth, and Carl Sagan's name for it) and what "adding light"
meant here. Meet chose to bridge it in the opening: after "Hola! I'm Meet.", a second
line names the dot, and Earth shows through as it is said.

At first that line faded as the greeting flew into the hero. Meet wanted the opening
and the hero joined more seamlessly, and chose for the line to become the headline:
the hero now reads "Hola! I'm Meet." over **"This pale blue dot is where I build
things."**, and "Adding light to the pale blue dot." is retired from the hero. The
page title follows. The closing chapter ("It is a little brighter than it was.")
still stands on its own.

Meet then asked for the line to be said on one line, left-aligned, and to break into
the headline's lines in flight, line by line. In flight its words are grouped by the
line each falls on in the hero, and each group flies as one rigid line: its first
word flies from where it was to where it will be, and the others keep their places
along it, scaled with the type. Every line flies straight to its place, all of them
together. (A version in which the bottom line left first, on an arc, so that no line
crossed another, read to Meet as a jump; he preferred the direct move, in which the
lower lines pass across the first for a moment.) The hero's headline is built of the
same per-letter boxes
(`Headline` in `intro.tsx`) and every destination is measured from it, so on the last
frame every letter sits on the hero's: 0 px off at 1440×900 and 390×844.

### Earth grows out of the dot (29 September)

Earth used to show through the black, dimmed, for a second before the flight, then
fade up with the lift. Meet found that faded preview and fade-in clumsy. Now Earth is
not drawn at all while the opening speaks. As the lines fly, the black lifts in 450 ms
(what appears is the sky), and Earth grows from a single pale blue point of light to
the full terminal Earth over the 1.5 s flight, on the same curve, in log space as the
camera zooms: first the point (the renderer's own for a body too small for glyphs),
then the glyphs resolving, then the orbits. The page tells the canvas when the flight
begins (`arriveRef`); on a return visit, or under reduced motion, Earth is simply
there.

One trap on the way: `letter-spacing` in ems is fixed to pixels where it is declared
and inherited as pixels, so set on the whole line it did not grow with each word, and
letters landed up to 9.5 px apart from the hero's. The tracking is now set on each
word, in its own ems.

As the visitor scrolls on to the map, its title, now **"Everything I've made, I made on
this little planet."**, is spoken the same way the first time it comes into view
(`SpokenTitle` in `intro.tsx`). If it is already on screen when the page loads, or
motion is reduced, it is simply there.

`intro-timeline.ts` is now a builder, `speak(words)`, that gives any line its letters,
its loading stretches, its ticks and its glyphs on one clock; the opening (greeting and
second line together) and the map title are both built with it.

Headings made of one box per letter can break a line between any two letters ("little
pl / anet."), so each word is held together. And an observer with several thresholds
can report several crossings in one batch on a quick scroll; reading only the first
left the map title, now and then, never spoken. Every observer on the page now reads
the latest entry, which also fixes a chapter's text that could stay invisible.

### Revised the same day

The first version opened on a lone point of light that glided into place as the full
stop, decoded the whole line in one quick run, and flew it into the hero as a FLIP
(a transform). Meet found the pace off and the dot at the start unwelcome. Worse, the
line visibly jumped at the end of the flight. The FLIP scaled by the ratio of the two
boxes' widths, and the hero's greeting is a block as wide as its column (544 px at
1440 wide), not as wide as its text. So the line landed about three times too large
(scale 0.70 where 0.23 was right) and snapped down when the hero's greeting took over.

The flight no longer uses a transform. Every frame it sets the line's real font size
(interpolated in log space, like the camera's zoom) and its top-left corner, measured
against the hero's greeting each frame, and the black's opacity from the same eased
progress. The last frame is the hero's own greeting at the same size and position, so
the handover can't jump. Checked by logging both boxes every frame: they end within
0.02 px.

The page is held still by cancelling scroll input rather than hiding the overflow:
hiding it takes the scrollbar away and brings it back, which would shift the hero
sideways under the line as it lands.

### Plainer signs (29 September)

The chapter tracker's labels are capitalised ("Earth", "Map", "Now"), and the hero's
scroll hint, "scroll to pull back", which leaned on the space metaphor, now says what
is below and what to do: "Scroll to see my work".

## Sound (`src/components/universe/intro-sound.ts`)

Synthesised with the Web Audio API; no audio files. Modelled on OpenAI's "Refreshed."
film, which Meet gave as the reference (the audio file, not the film, so it could be
measured). The streaming ticks at 2.0 to 4.8 s were analysed for shape, pitch and rhythm,
and rebuilt from sine tones; nothing from the recording is sampled or shipped.

- **The text ticks while it loads.** Each tick is about six cycles of a pure 1.3 kHz
  tone under a smooth 5 ms swell and fade, over a faint 190 Hz ring that lingers about
  20 ms: the reference tick's measured shape. Every tick is the same sound. The ticks
  run continuously through each stretch of loading text, from the first glyph to the
  moment the last letter settles (0 to 465 ms for "Hola!", 1250 to 1961 ms for "I'm
  Meet", which overlap and so run as one), 43 to 74 ms apart, and the pause between
  is silent. Each is panned to where the text is loading.
- **One timeline, fixed.** `src/components/universe/intro-timeline.ts` holds the
  words, when each letter decodes, the ticks, and which glyph a decoding letter
  shows. Glyphs change only on ticks, so every tick is a visible change. The whole
  run of ticks is scheduled on the audio clock when the text begins, rather than
  fired frame by frame, so the rhythm is identical on every visit: three runs
  started at different moments scheduled all 22 ticks at the same times, to the
  millisecond. A skip cuts the ticks still to come.
- Nothing else sounds: no tone for the full stop, the flight or the landing.
- A compressor on the master keeps a quick run of ticks from clipping.

A first version (pitched pentatonic "droplets", a glass chime, a breath of noise
under the flight) was a guess at the reference without hearing it. Meet disliked it,
and it was replaced. A second ticked as each letter finished decoding, so the sound
trailed the text, and it marked the full stop and the landing with low tones; Meet
asked for sound only while the text loads. A third ticked when the animation loop
saw a glyph change, on a glyph clock tied to page-load time, so the pattern
differed on every refresh and had holes; the fixed timeline replaced it.

Browsers only allow sound after the visitor has interacted with the page. Meet chose
no "enter with sound" prompt: the opening starts on its own as before, and sounds
only when the browser allows it.
Nothing is scheduled while the audio context is suspended (queued ticks would all
fire at once when it resumed), and the context is closed once the opening is over.
Under reduced motion a word lands whole, with one tick.

## Stars behind Earth

The close-up had only a faint one-pixel dust field behind Earth. It now has a sky
too: about one star per 9,000 px² (around 145 at 1440×900, 35 on a phone), each a
light glyph that twinkles on its own clock (0.6 to 2.4 rad/s) and changes from `·` to
`+` to `*` as it brightens. Most are cool white, a few warm, a few pale blue. None is
drawn over Earth's disc. As the camera pulls back they gather in towards the dot and
fade out by the map, where the galaxy's own deep field takes over. Under reduced
motion they hold still.

## The line

"What's missing, I make." became **"Adding light to the pale blue dot."** Every piece of
work on the map is a point of light around the dot; the line said what Meet does in the
site's own terms, and the closing chapter ("It is a little brighter than it was.")
answered it. On 29 September it gave way to "This pale blue dot is where I build
things.", which needs no reference to follow (see above).
