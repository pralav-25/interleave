# Animation & Effects

Reusable motion baseline; use only effects that help orientation or feedback.

## Motion tokens
- **Fast:** `120–160ms` for hover, press, and focus feedback.
- **Standard:** `180–260ms` for menus, tooltips, and state changes.
- **Entrance:** `300–450ms` for dialogs and section reveals.
- **Stagger:** `40–70ms` between related items; keep the sequence brief.
- **Enter:** `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Exit:** `cubic-bezier(0.4, 0, 1, 1)`; shorter than entrance.
- **Move / resize:** `cubic-bezier(0.4, 0, 0.2, 1)`.

## Effect recipes
| Effect | Suggested behavior |
|---|---|
| Hover | Slight color change or `translateY(-2px)` on interactive cards. |
| Press | Brief `scale(0.98)`; restore on release or cancellation. |
| Reveal | Fade in with `translateY(12–20px)`; trigger once on entry. |
| Menu / tooltip | Fade with a `4–8px` offset; reverse on close. |
| Dialog / drawer | Fade backdrop; gently scale dialog or slide drawer. |
| Accordion | Animate height briefly; keep expanded state accessible. |
| Tabs | Move the active indicator; optionally fade the new panel. |
| Page change | Short fade; preserve navigation, focus, and scroll expectations. |
| Loading | Subtle skeleton pulse or spinner with a text status. |
| Success / error | Brief icon or color transition with an explicit message. |
| Parallax | Optional small decorative movement; disable on touch and reduced motion. |
| Ambient effects | Optional slow gradient or glow; avoid distracting continuous motion. |

## Interaction rules
- Trigger feedback immediately; never delay an action for an animation.
- Support keyboard and touch; essential information cannot depend on hover.
- Interrupt and reverse transitions smoothly during repeated interaction.
- Avoid scroll hijacking, large zooms, flashing, and unnecessary bounce.

## Performance & accessibility
- Prefer `transform` and `opacity`; avoid continuous layout, blur, or shadow animation.
- Use explicit transition properties, not `transition: all`.
- Pause offscreen loops; use `will-change` sparingly and temporarily.
- Under `prefers-reduced-motion: reduce`, remove decorative movement, parallax, stagger, and loops; use instant changes or brief fades.
- Keep content visible if animation scripts fail; test touch, keyboard, reduced motion, and slower devices.
