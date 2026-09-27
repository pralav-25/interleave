# Liquid Glass on the website

The landing page follows Apple's [Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): material belongs to the navigation and control layer, with quieter content surfaces beneath it. The black canvas, app icon, and real MacBook captures stay intact.

This is a web implementation, not Apple's native SwiftUI, UIKit, or AppKit material.

`features/product/liquid-glass.tsx` supplies a reusable optical layer for the header, screenshot picker, install button, and installation help. A size-specific displacement map bends the backdrop at rounded edges in Chromium. CSS supplies translucency, a reflective rim, and pointer-responsive lighting; labels remain outside the filter so they stay sharp. The selection is a thin overlay within the picker, rather than a second glass layer.

WebKit and Gecko use the CSS blur and highlight fallback because SVG backdrop-filter support differs between browser engines. No new dependencies or animation loops are required. Resize work is deduplicated and bounded, pointer updates are scheduled once per frame, and observers and listeners are removed on unmount. Touch input does not track a highlight.

Reduced motion removes lensing and pointer tracking, and disables decorative transitions. Reduced transparency or increased contrast uses opaque material, a clear border, and no backdrop filter. Keyboard focus, arrow/Home/End tab navigation, and Escape-to-dismiss installation help remain available.
