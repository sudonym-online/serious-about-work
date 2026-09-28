// The extension service worker. Chrome starts it on events and stops it when idle,
// so all state lives in chrome.storage and every listener is registered at the top level.
import type { Message, State } from '$lib/messages';
import { Storage, pack } from '$lib/storage';
import { Rules } from './rules';

const APP_URL = chrome.runtime.getURL('index.html');

// Events can fire together. One chain keeps each read-modify-write on storage whole.
let chain: Promise<unknown> = Promise.resolve();
const queue = <T>(fn: () => Promise<T>): Promise<T> => {
	const next = chain.then(fn, fn);
	chain = next.catch(() => {});
	return next;
};

// ------------------- RULES -------------------

const applyRules = async () => {
	const { profiles, activeProfileId, alwaysBlocked, settings } = await Storage.getAll();
	const profile = profiles.find((p) => p.id === activeProfileId);
	if (!profile) return Rules.clear();
	await Rules.apply(Rules.build(profile, alwaysBlocked, settings));
};

// A list edit during a session takes effect at once.
Storage.onChange((changes) => {
	if (!changes.profiles && !changes.alwaysBlocked && !changes.settings) return;
	queue(applyRules);
});

// ------------------- SESSION -------------------

const startSession = async (profileId: string, planned: number | null) => {
	if (await Storage.get('activeProfileId')) return;

	const sessions = await Storage.get('sessions');
	sessions.push({ id: crypto.randomUUID(), profileId, start: new Date(), end: null, planned });
	await Storage.set('sessions', sessions);
	await Storage.set('activeProfileId', profileId);
	await Rules.clear();
	await applyRules();
	console.log(`[worker] session started: ${profileId}`);
};

const stopSession = async () => {
	const sessions = await Storage.get('sessions');
	const session = sessions.findLast((s) => s.end === null);
	if (!session) return;

	session.end = new Date();
	await Storage.set('sessions', sessions);
	await Storage.set('activeProfileId', null);
	await Rules.clear();
	console.log(`[worker] session stopped: ${session.profileId}`);
};

const getState = async (): Promise<State> => {
	const { profiles, activeProfileId, sessions } = await Storage.getAll();
	return {
		profile:    profiles.find((p) => p.id === activeProfileId) ?? null,
		session:    sessions.findLast((s) => s.end === null) ?? null
	};
};

// ------------------- MESSAGES -------------------

const handle = async (message: Message): Promise<unknown> => {
	switch (message.type) {
		case 'start':       return startSession(message.profileId, message.planned);
		case 'stop':        return stopSession();
		case 'getState':    return getState();
	}
};

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
	queue(() => handle(message)).then((result) => sendResponse(pack(result)));
	return true; // keeps the channel open for the async response
});

// ------------------- TOOLBAR -------------------

chrome.action.onClicked.addListener(async () => {
	const [tab] = await chrome.tabs.query({ url: APP_URL });
	if (!tab?.id) {
		await chrome.tabs.create({ url: APP_URL });
		return;
	}
	await chrome.tabs.update(tab.id, { active: true });
	await chrome.windows.update(tab.windowId, { focused: true });
});

chrome.runtime.onInstalled.addListener(() => {
	console.log('[worker] installed');
});
