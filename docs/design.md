# Design

Reusable baseline; adapt colors, fonts, and assets to the brand.

## Visual direction
- Clean hierarchy, generous whitespace, one primary action per section.
- Use a consistent accent color, neutral surfaces, and clear text contrast.
- Add depth selectively; keep decoration behind content.

## Layout & typography
- Mobile-first layout; use flexible grids and a centered content container.
- Suggested widths: content `1200px`, reading text `65ch`; gutters `16–32px`.
- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`.
- Use one readable font family, up to three weights, and consistent heading levels.
- Suggested text: body `16–18px`, line height `1.5–1.7`; fluid headings.

## Colors & components
- Define tokens for background, surface, text, muted text, accent, border, success, warning, and error.
- Keep buttons, inputs, cards, menus, icons, and navigation visually consistent.
- Suggested radii: controls `8px`, cards `16px`, badges fully rounded.
- Every control needs default, hover, focus, active, and disabled states.
- Provide useful loading, empty, success, and error states.

## Visual effects
- **Shadows:** soft elevation for cards, menus, and dialogs.
- **Gradients:** subtle backgrounds or accent highlights.
- **Blur / glass:** optional translucent surfaces with a readable opaque fallback.
- **Glow:** restrained emphasis on a selected or primary element.
- **Borders / overlays:** separate surfaces and keep text readable over images.
- **Images / icons:** consistent proportions, crop treatment, and stroke weight.
- Avoid combining every effect on one element.

## Responsive & accessible
- Stack columns when content becomes cramped; prevent horizontal overflow.
- Preserve content order and primary actions across screen sizes.
- Keep keyboard focus visible and controls easy to tap; aim for `44×44px` targets.
- Use semantic elements, labels, meaningful alt text, and messages beyond color alone.
- Motion behavior and reduced-motion handling are specified in `animation.md`.
