# Interleave animation guide

## Intent

Use motion to introduce the product and explain changes in state. The pacing takes inspiration from the spacious hero and staged product presentation on [Google Antigravity](https://antigravity.google/), observed on September 28, 2026. These are Interleave's implementation rules, derived from the public page.

Preserve the existing glass response, navigation scrolling, experiment interactions, and reduced-motion safeguards.

## Timing and movement

| Element | Behavior | Timing |
| --- | --- | --- |
| Hero wordmark | Fade and rise 20px | 620ms, no delay |
| Headline lines | Fade and rise individually | 620ms, 60/120ms delays |
| Hero description and actions | Follow the headline | 620ms, 180/240ms delays |
| MacBook stage | Rise 28px and settle from scale 0.985 | 700ms, once on entry |
| Feature illustrations | Same restrained media reveal, independent of the adjacent copy | 700ms, once on entry |
| Section introductions and features | Fade and rise 20px | 460ms; related items stagger by 70ms |
| Screenshot selector | Existing sliding glass selection | 420ms |
| Screenshot and experiment panels | Brief state-change reveal | 220ms |
| Install help | Expand from the trigger with a short fade | 220ms |
| Link arrows | Move 2px on hover | 140ms |
| Navigation links | Existing controlled section scroll | 600–1150ms according to distance |

Entrance easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Keep interaction feedback immediate. Do not add continuous floating, exaggerated zooms, or extra delays before an action takes effect.

## Implementation

`features/product/motion.tsx` observes `[data-reveal]` elements. `data-reveal="hero"` selects the introductory timing; `data-reveal="media"` selects the restrained scale reveal. A numeric `data-reveal-delay` is capped at 240ms. Each element reveals at most once per mount.

Use transforms and opacity. Content remains visible before hydration and if JavaScript fails. Do not pre-hide the page in CSS. Disconnect observers and cancel outstanding animations when the component unmounts.

The existing glyph texture runs for at most 3.6 seconds of active time, pauses offscreen or in a hidden tab, and then settles. Liquid Glass pointer highlights update at most once per animation frame. Do not add another animation engine or idle rendering loop.

The replay schedules, assistant flow, and example investigation are static illustrations. Their labels remain readable without motion. Alternate their desktop positions through CSS grid; preserve the reading order on narrow screens.

## Navigation and accessibility

Keep browser scrolling under user control. The navigation dock's animated section scroll stops on wheel, touch, navigation keys, history changes, or a reduced-motion preference change. Keyboard activation moves focus to the destination section.

With `prefers-reduced-motion: reduce`, skip hero and section reveals, cancel active entrance animations, disable decorative transitions and arrow movement, and preserve immediate state changes. Existing glass handling also stops pointer tracking and lensing. Reduced transparency and increased contrast retain the opaque material fallback.

Use semantic headings and labels once in the accessibility tree. Separate visual headline lines must still read as one heading. Preserve arrow/Home/End screenshot navigation, experiment selection, and Escape-to-dismiss install help.

## Validation

Check desktop and 320/390px phone widths, install help from the hero and final section, both tab interfaces, and navigation focus. Confirm that motion preference changes cancel active work and that listener/observer cleanup leaves no animation running. Run the project checks and production build before deployment.
