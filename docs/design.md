# Interleave design guide

## Direction

A spacious developer product page: a clear promise, a real product view, then progressively deeper evidence. Keep Interleave's black canvas, blue app identity, Liquid Glass controls, MacBook captures, and interactive experiment explorer.

Reference: [Google Antigravity](https://antigravity.google/), observed on September 28, 2026. The public page uses oversized, lightly weighted headlines, generous negative space, paired actions, a large rounded media stage, and distinct product sections. This guide adapts those observations to Interleave.

## First screen

- Show the existing app icon and Interleave wordmark together.
- Lead with “Concurrency. Made visible.” on two lines.
- Explain the product in one short paragraph. Keep exhaustive exploration explicitly limited to the finite model.
- Make installation and opening the lab available immediately. Reuse the existing install flow and lab route.
- Follow the introduction with a large MacBook screenshot on a quiet rounded stage. Use the actual app capture; keep the photographed frame and camera notch.
- Keep the subtle glyph field behind the introduction, with a clear area behind the headline.

## Layout and typography

- Content width: `72rem`; fluid gutters: `1.25–1.5rem`.
- Typeface: the project's existing Geist font, followed by system fallbacks. No additional font download.
- Hero: `clamp(2.7rem, 7vw, 6rem)`, weight 450, line height 1.03.
- Section titles: `clamp(2rem, 4.3vw, 3.5rem)`, weight 450, line height 1.08.
- Body: 17–20px, with comfortable 1.5–1.6 line height. Regular control labels remain readable at 14px or larger.
- Section labels: 14px with a restrained change in tracking; no all-caps marketing badges.
- Desktop section introductions pair a large title with a shorter explanatory paragraph. Stack them on phones.
- Use the width of the page for paired visual and text sections. The walkthrough places its MacBook on the left and its explanation on the right. Investigation stories alternate text/visual, visual/text, then text/visual. The install section finishes with the MacBook on the left and the install actions on the right.
- Give each feature a useful illustration: alternate worker schedules, the local AI context flow, and an example investigation. Label illustrations as examples and keep real product screenshots in their MacBook frames. Do not present illustrative content as a live saved result or generated AI answer.
- Use `4–7.5rem` between major sections. Do not stretch interactive controls merely to fill space.

## Color and surfaces

| Role | Treatment |
| --- | --- |
| Page | Pure black `#000` |
| Main text | Near-white `#f5f5f7` |
| Secondary text | Cool gray `#b1b8c4` |
| Links and selected states | Soft blue `#84bbff` |
| Quiet content surfaces | Near-black `#101114` |
| Hairlines | White at low opacity |
| Material | Existing Liquid Glass optical layer on navigation, screenshot tabs, and install controls |

Glass belongs to the control layer. Keep the content readable on quiet surfaces. Do not apply refraction to text or stack full glass materials. Preserve the current opaque accessibility fallback.

## Preserve the useful parts

- Floating navigation dock, current-section indication, cancellable section scrolling, and keyboard focus management.
- All six selectable experiments, their illustrated failures, fixes, and reproducible lab links.
- Three real screenshot scenes and their accessible tab controls.
- Original app icon, macOS screenshots, PWA installation, local AI explanation, private workspace, and FAQs.
- Clear qualifications about offline use, account requirements, and model limits.

## Responsive behavior

On small screens, retain the compact navigation dock, stack the hero actions where needed, and allow the headline to scale down. Below 960px, stack the paired feature layouts in their document order, with the copy before each illustration. Keep the four capability labels in a readable two-column strip. Preserve the experiment index's existing mobile layout. No horizontal page overflow or cropped control labels at 320px.

Use the motion rules in `animation.md`. Validate the install popover from both entry points, screenshot tabs, experiment selection, keyboard navigation, and reduced-motion behavior before publishing.
