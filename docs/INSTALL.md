# Install Interleave

Interleave 0.4 is a progressive web app. It uses the same reviewed application as the website, in its own window. There is no separate native binary or paid subscription.

1. Open the product site in a supported browser.
2. Choose **Install Interleave**. Chrome/Edge may show their native install prompt. If your browser does not expose that prompt, the button displays browser-specific instructions.
3. On macOS Safari, use **File → Add to Dock**. On Chrome, use **Cast, save and share → Install page as app**. On Edge, use **Apps → Install this site as an app**. On iOS, use **Share → Add to Home Screen**.
4. Open the lab online once before going offline. The app starts at `/lab`.

Browser installation availability and menu labels vary by version. Installing does not enable AI or sign you in. Use your browser's app management to uninstall. Clearing site data also removes cached public application files.

## Offline and updates

Production builds generate a versioned service worker with public JavaScript, CSS, fonts, icons, and the `/lab` shell. The optional 5.8 MB model worker and external model weights are not precached. Private API data, account pages, notes, sign-in, RSC payloads, and third-party responses are never persisted by this worker.

The six models execute entirely in the browser. Cloud saves and sign-in remain online operations. If a private page is opened offline, a neutral reconnect page appears. Private data is not served from the app cache. The offline claim assumes browser storage remains available and the first installation completes successfully.

A new build receives a content-derived cache version. An update notification lets the user export an unsaved trace before reloading; the app does not force reload an ongoing investigation. The service worker script is revalidated instead of served as an immutable asset.

## Routes and compatibility

- `/`: product landing page and installation instructions; no model download.
- `/lab`: workbench and PWA launch page.
- `/workspace`: existing authenticated investigations.
- Legacy `/#v=1&...` replay links redirect to `/lab#v=1&...` in the browser. The complete fragment is retained and validated by the existing decoder.

## Release checks

Run `pnpm check` and `pnpm build:vercel`. The build first emits the Cloudflare application, then generates the offline asset list, then packages the same client assets for Vercel. Deploy both the Sites backend and Vercel entry point from the same source. Do not publish only a static landing page over the existing authenticated app.

Manually verify landing links, all walkthrough tabs, mobile overflow, an exact replay, private workspace sign-in, browser installation, and an offline lab reload. The offline regression tests cover private cache exclusion and fallback behavior; these are not substitutes for a real browser test.
