# Extension Plan

This plan changes the app from a fullscreen web app into a browser extension. The extension blocks distracting sites and tracks the time spent on each task.

Mark each item when it is complete. Each phase ends with a "Done when" check. Do not start a phase before the check of the previous phase passes.

## Goals

- Block sites that do not help the active task.
- Allow the sites that the active task needs.
- Record the time on each task and each site.
- Show sessions, site visits, and block attempts on the timeline.
- Keep the fullscreen lock as an option.

## Terms

**Adapter.** The last step of `vite build`. The adapter packages the SvelteKit output for one target. `adapter-auto` selects a hosting platform, such as Vercel. `adapter-static` writes a folder of HTML, JS, and CSS files with no server. An extension is a folder of files and cannot run a server. Thus the extension must use `adapter-static`.

**SSR (server-side rendering).** SvelteKit runs the components before the browser gets the page. The result is an HTML file that already has content. With `adapter-static`, this run occurs one time, at build time, in Node. Node has no `window`, no `document`, and no `chrome` object. A `chrome.storage` call during this run stops the build. With SSR off, SvelteKit writes an empty page. The components then run only in the browser. Hash routing turns off SSR automatically.

**Hash routing.** The route goes after a `#` in the URL, for example `index.html#/settings`. The browser does not send the part after `#` to the server. Thus a reload always loads `index.html`, and SvelteKit reads the route from the hash. Chrome serves extension files from disk and cannot send `index.html` for an unknown path. With path routing, a reload on `/settings` gives a 404 error. Hash routing prevents this error.

**Service worker.** The background script of an MV3 extension. It has no page and no DOM. Chrome stops the worker after about 30 seconds with no events. The worker starts again on the next event.

## Architecture

The Svelte app runs as a page inside the extension. There is no separate server.

```
 ┌──────────────── extension (MV3) ─────────────────┐
 │                                                  │
 │  app tab  <─────── messages ───────>  service    │
 │  (tasks, timeline,                    worker     │
 │   session HUD)                        (state,    │
 │        │                               tracking, │
 │        └──────── chrome.storage ─────── rules)   │
 │                                          │       │
 │                        declarativeNetRequest     │
 │                        tabs / idle / alarms      │
 └──────────────────────────────────────────────────┘
```

The service worker owns the session state. The app tab only shows this state and sends commands. If the user closes the app tab, the session continues.

Chrome can stop the service worker at any time. Thus the worker must write all state to `chrome.storage.local`. The worker must not keep state only in variables. The worker must use `chrome.alarms` for timed work, not `setInterval`.

## Data Model

The current `Task` type has one `start` and one `end`. This model cannot record a pause and a resume. Replace it with these types in `src/lib/types.ts`:

```ts
interface Task {
	id: string;
	name: string;
	description: string;
	due: Date | null;
	status: Status;
	estimate: number | null; // minutes
	allowedDomains: string[];
}

interface Session {
	taskId: string;
	start: Date;
	end: Date | null;
}

interface ActivitySample {
	taskId: string;
	domain: string;
	start: Date;
	end: Date;
}

interface BlockAttempt {
	taskId: string;
	domain: string;
	time: Date;
	overridden: boolean;
	reason: string | null;
}
```

### Storage keys

| Key | Type | Contents |
| --- | --- | --- |
| `tasks` | `Task[]` | All tasks. |
| `activeTaskId` | `string \| null` | The task of the active session. |
| `sessions` | `Session[]` | All sessions. An active session has `end: null`. |
| `samples` | `ActivitySample[]` | Time on each domain. |
| `openSample` | `{ taskId, domain, start } \| null` | The sample that is not closed yet. |
| `blockAttempts` | `BlockAttempt[]` | All redirects to the block page. |
| `alwaysBlocked` | `string[]` | Domains that no task can allow. |
| `settings` | `object` | Idle threshold, override wait, deep mode. |

Store dates as numbers in `chrome.storage`. Convert them to `Date` objects in the app.

## Phase 1: Load the app as an extension page

### Build setup

- [x] Run `npm install -D @sveltejs/adapter-static @types/chrome`.
- [x] In `vite.config.js`, replace the `adapter-auto` import with `adapter-static`.
- [x] Use `adapter()` with no options. Hash routing writes `index.html` without a `fallback` option.
- [x] Add `router: { type: 'hash' }` to the `sveltekit()` options.
- [x] Add `appDir: 'app'` to the `sveltekit()` options. Chrome rejects extension files that start with `_`, such as the default `_app` folder.
- [x] Add `"types": ["chrome"]` to `compilerOptions` in `tsconfig.json`.
- [x] Run `npm uninstall @sveltejs/adapter-auto`.

The `sveltekit()` options in `vite.config.js` must look like this:

```js
sveltekit({
	compilerOptions: { /* no change */ },
	router: { type: 'hash' },
	appDir: 'app',
	adapter: adapter()
})
```

### Disable SSR

- [x] Make sure that SSR is off. Hash routing turns off SSR and prerendering.
- [x] Do not add `ssr` or `prerender` options. With hash routing, the build stops with an error if these options exist.
- [x] Make sure that `build/index.html` has an empty `<body>` with only the start script.

### Manifest

- [x] Create `static/manifest.json`. Vite copies the `static` folder into `build`.
- [x] Set `manifest_version` to `3`.
- [x] Set `name`, `version`, and `description`.
- [x] Add an `action` with a toolbar icon.
- [x] Add the icon files to `static/icons/`.

The icon source is `src/lib/assets/icon.svg`. Chrome does not accept SVG icons. After a change to the source, make the PNG files again:

```sh
for s in 16 32 48 128; do rsvg-convert -w $s -h $s src/lib/assets/icon.svg -o static/icons/icon-$s.png; done
```

Later phases add permissions to the manifest. The toolbar button does nothing until Phase 2 adds a click handler.

### Content Security Policy

MV3 does not allow inline scripts in extension pages. SvelteKit writes an inline script into `index.html` to start the app. The build output has this inline script.

The start script also uses root paths such as `/_app/...`. In an extension, `/` is the extension root. Thus these paths work.

- [x] Run `npm run build`.
- [x] Open `build/index.html`. Look for a `<script>` tag with code inside it.
- [x] Write `scripts/extract-inline.js`.
- [x] Make the script move the inline code into `build/boot.js`.
- [x] Make the script replace the inline tag with `<script src="/boot.js"></script>`.
- [x] Change the `build` script in `package.json` to `vite build && node scripts/extract-inline.js`.

Do not add `type="module"` to the `boot.js` tag. The boot code reads `document.currentScript`. This value is `null` in a module script.

The name `boot.js` prevents confusion with the `_app/immutable/entry/start.*.js` chunk.

### Load in Chrome

- [x] Open `chrome://extensions`.
- [x] Turn on "Developer mode".
- [x] Click "Load unpacked" and select the `build` folder.
- [x] Open `chrome-extension://<id>/index.html`.
- [x] Open DevTools. Make sure that the console shows no CSP errors.
- [x] Click "start session". Make sure that the timer and the task list work.

### Development loop

- [x] Write `scripts/watch.js`. It runs `npm run build` after each change in `src/` or `static/`.
- [x] Add a `dev:ext` script: `node scripts/watch.js`.
- [x] Add VS Code tasks for `build` and `watch` in `.vscode/tasks.json`.
- [x] After each rebuild, reload the extension page. Click the reload button on the extension card only after a change to `manifest.json` or the service worker.

Do not use `vite build --watch`. Each SvelteKit build writes `.svelte-kit/generated` again. The Vite watcher sees these files and starts a new build without end.

**Done when:** the current app runs from `chrome-extension://<id>/index.html` with no console errors.

## Phase 2: Move the session state to the service worker

### Worker build

SvelteKit has a service worker build. The worker uses this build, not a second Vite config. The adapter deletes the `build` folder on each build. The SvelteKit build writes the worker again each time, so no extra build step is necessary.

- [x] Create `src/background/index.ts`.
- [x] Add `files: { serviceWorker: 'src/background' }` to the `sveltekit()` options.
- [x] Add `serviceWorker: { register: false }`. The page must not register the file as a web service worker.
- [x] Make sure that the build writes `build/service-worker.js`.
- [x] Make sure that `$lib` imports go into `service-worker.js` as one file.
- [x] Add `"background": { "service_worker": "service-worker.js", "type": "module" }` to the manifest.
- [x] Add `"storage"` and `"alarms"` to `permissions` in the manifest.
- [x] Reload the extension card. Open the service worker console. Make sure that it shows the install message.

### Shared code

- [ ] Create `src/lib/messages.ts`. Define one type for each message.
- [ ] Create `src/lib/storage.ts`. Put the typed get and set functions for each storage key here.
- [ ] Use `storage.ts` from the worker and from the app. Do not call `chrome.storage` directly.

```ts
type Message =
	| { type: 'start'; taskId: string }
	| { type: 'stop' }
	| { type: 'switchTask'; taskId: string }
	| { type: 'getState' };
```

### Worker logic

- [ ] Handle `start`. Write a new `Session` with `end: null`. Set `activeTaskId`.
- [ ] Handle `stop`. Set `end` on the active session. Set `activeTaskId` to `null`.
- [ ] Handle `switchTask`. Stop the active session. Start a new session for the new task.
- [ ] Handle `getState`. Return the active task and the active session.
- [ ] Listen to `chrome.action.onClicked`. Open the app tab, or focus it if it is open.
- [ ] Write each change to storage before the handler returns.

### App changes

- [ ] Create `src/lib/session.svelte.ts` with a `$state` object for the session state.
- [ ] On load, read the state from storage into this object.
- [ ] Listen to `chrome.storage.onChanged`. Update the object on each change.
- [ ] Send `start` from the "start session" button.
- [ ] Calculate the session length as `Date.now() - session.start`.
- [ ] Remove the 1 ms `setInterval` from `+page.svelte`.
- [ ] Use `requestAnimationFrame` to update the HUD display.
- [ ] Move the task list from component state to the `tasks` storage key.

### Fix the listener defect

The `$effect` in `+page.svelte` has a defect. When `fullscreen` is true, the cleanup function only clears the interval. The document listeners stay attached.

- [ ] Put the document listeners in their own `$effect`.
- [ ] Make that `$effect` always return a cleanup that removes the listeners.

**Done when:** a session continues after the app tab closes and opens again. The tasks also stay after a browser restart.

## Phase 3: Per-task allowlist and block page

### Permissions

- [ ] Add `"declarativeNetRequest"` to `permissions`.
- [ ] Add `"host_permissions": ["<all_urls>"]`. A redirect rule needs host access.
- [ ] Add `blocked.html` to `web_accessible_resources` for `<all_urls>`.

### Task and settings UI

- [ ] Add an allowed-domains input to `AddTaskRow.svelte`.
- [ ] Show the allowed domains in `TaskRow.svelte`.
- [ ] Add a settings view at the `#/settings` route.
- [ ] Add an editor for the `alwaysBlocked` list to the settings view.
- [ ] Add an "allow localhost" option to the settings view.

### Block rules

- [ ] Write `buildRules(task, alwaysBlocked)` in `src/background/rules.ts`.
- [ ] Make rule 1 a redirect for all `main_frame` requests.
- [ ] Add one `allow` rule with a higher priority for each allowed domain.
- [ ] Add one redirect rule with the highest priority for each `alwaysBlocked` domain.
- [ ] Always allow `chrome-extension://` URLs.
- [ ] On `start` and `switchTask`, remove all dynamic rules. Then add the new rules.
- [ ] On `stop`, remove all dynamic rules.

Set the redirect to the extension page with the blocked URL as a parameter:

```ts
{
	type: 'redirect',
	redirect: { regexSubstitution: 'chrome-extension://<id>/blocked.html?url=\\0' }
}
```

### Block page

- [ ] Create `static/blocked.html` and `static/blocked.js`. Keep this page separate from the Svelte app.
- [ ] Use plain JS in `blocked.js`. Vite copies `static` files and does not compile them.
- [ ] Read the `url` parameter. Show the blocked domain.
- [ ] Read `activeTaskId` from storage. Show the task name.
- [ ] Add a "back to work" button that opens the app tab.
- [ ] Send a `blocked` message to the worker on page load.
- [ ] In the worker, record a `BlockAttempt` for each `blocked` message.

**Done when:** a started task blocks all sites that are not on its list. The block page shows the task name.

## Phase 4: Override with friction

A hard block makes the user disable the extension. A wait and a logged reason make an override cost something.

- [ ] Add an "I need this site" button to the block page.
- [ ] Disable the button for 30 seconds. Show a countdown.
- [ ] Show a text field for the reason. Require 10 or more characters.
- [ ] On submit, send an `override` message with the domain and the reason.
- [ ] In the worker, add an `allow` rule for the domain.
- [ ] Create an alarm that removes the rule after 10 minutes.
- [ ] Set `overridden: true` and `reason` on the `BlockAttempt`.
- [ ] Reload the original URL.
- [ ] Put the wait and the allow time in `settings`.

**Done when:** an override opens the site. The site is blocked again after 10 minutes. The log shows the reason.

## Phase 5: Activity tracking

### Permissions

- [ ] Add `"tabs"` and `"idle"` to `permissions`.

### Events

- [ ] Listen to `chrome.tabs.onActivated`.
- [ ] Listen to `chrome.tabs.onUpdated`. Use only changes to `url`.
- [ ] Listen to `chrome.windows.onFocusChanged`.
- [ ] Call `chrome.idle.setDetectionInterval(60)`.
- [ ] Listen to `chrome.idle.onStateChanged`.

### Sample logic

- [ ] Write `getActiveDomain()`. Return the domain of the active tab in the focused window.
- [ ] Return `null` when no Chrome window has focus.
- [ ] When the domain changes, close `openSample` and add it to `samples`.
- [ ] Then start a new `openSample` for the new domain.
- [ ] When the state changes to `idle` or `locked`, close `openSample`. Do not start a new sample.
- [ ] When the state changes to `active`, start a new sample.
- [ ] Record samples only while a session is active.
- [ ] Do not record samples for extension pages.
- [ ] Drop samples that are shorter than 2 seconds.

### Display

- [ ] Show the time on each domain for the active task in the app.

**Done when:** the app shows the time per domain for each task. Idle time does not count.

## Phase 6: Timeline integration

Read `timeline.svelte.ts` before this phase. Each change must keep the tick and mark calculations correct.

- [ ] Change `TimelineEvent` to use a `Session` for `extended` events.
- [ ] Show each `Session` as an `extended` event.
- [ ] Show each `BlockAttempt` as a `single` event.
- [ ] Use a different color for an overridden attempt.
- [ ] Show the domain and the reason in the hover text of an attempt.
- [ ] Update the tick calculation for many sessions per task.
- [ ] Update the mark calculation for many sessions per task.

**Done when:** one day of work shows as sessions and marks on the timeline.

## Phase 7: Review and estimates

- [ ] Add an estimate input in minutes to `AddTaskRow.svelte`.
- [ ] Add a review view at the `#/review` route.
- [ ] Show the estimate and the actual time for each finished task.
- [ ] Show the total time for each task in the current day.
- [ ] Show the total time for each domain in the current day.
- [ ] Show the count of block attempts and the count of overrides.
- [ ] Show the longest session with no idle time.
- [ ] Add a date picker to show an earlier day.

**Done when:** the review view shows correct data for the current day.

## Phase 8: Optional modes

### Break mode

- [ ] Add a "break" button to the session HUD.
- [ ] On break, remove all block rules. Pause the active session.
- [ ] Create an alarm for the end of the break.
- [ ] When the break ends, add the rules again. Resume the session.

### Deep mode

- [ ] Add a `deepMode` option to each task.
- [ ] When a deep mode task starts, use the current fullscreen lock.
- [ ] Block all sites during deep mode, including the allowed domains.

### Exit log

- [ ] Log each session that ends before its planned end.
- [ ] At worker startup, look for a gap in `samples` during an active session.
- [ ] Log each gap as a possible disable of the extension.

**Done when:** a break removes the blocks and adds them again. A deep mode task uses fullscreen.

## Limits

- A user can disable the extension in two clicks. The extension cannot prevent this.
- The extension does not run in incognito windows unless the user allows it.
- The extension does not block desktop apps.
- Chrome limits the number of dynamic rules and regex rules. Keep the `alwaysBlocked` list short, or combine domains in one regex.
- `chrome.alarms` has a minimum period of 30 seconds.

## Open Questions

- [ ] Do we support Firefox? Firefox MV3 has small API differences.
- [ ] Do we sync data across devices with `chrome.storage.sync`? This storage has a small size limit.
- [ ] Do we export the data as CSV or JSON?
