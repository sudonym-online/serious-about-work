# Serious About Work

A Chrome extension that blocks distracting websites during focus sessions and tracks how the time was spent.

[Demo video: [paste link]]

[Screenshot or GIF: paste here]

## What it does

- **Profiles** (such as "school" or "work") each have a blacklist and a whitelist.
  - Empty whitelist: only blacklisted sites are blocked.
  - Non-empty whitelist: every other site is blocked.
  - A global always-blocked list overrides both.
- **Blocking** uses Chrome `declarativeNetRequest` redirect rules. A blocked site opens a block page that shows the domain and the profile.
- **Overriding** takes effort. Wait 30 seconds, type a reason of at least 10 characters, and the site is allowed for 10 minutes. The reason is logged.
- **Activity tracking** records time per domain from the active tab in the focused window. Idle time and visits under 2 seconds do not count.
- **App page** has a start menu, a task checklist per profile, a session timer, and a timeline of sessions, block attempts, overrides, and finished tasks. It also has an optional fullscreen lock.
- **Session review** shows planned and actual time, time per site, block attempts with override reasons, and finished tasks.

All data stays in the browser, in `chrome.storage`.

## Tech stack

- Svelte 5 and SvelteKit (`adapter-static`, hash routing)
- TypeScript and Vite
- Chrome Extension Manifest V3
- Chrome APIs: `declarativeNetRequest`, `alarms`, `tabs`, `idle`, `storage`

The background service worker owns the session state, so a session continues after the app tab closes.

## Run it locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Build the extension:

   ```sh
   npm run build
   ```

3. Open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**. Select the `build/` folder.

For development, run `npm run dev:ext` to rebuild on each change. Reload the extension page after each rebuild.

Other scripts:

- `npm run check`: Svelte and TypeScript checks
- `npm run lint`: ESLint
