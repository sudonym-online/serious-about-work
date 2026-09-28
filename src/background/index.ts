import type { Message, State } from '$lib/messages';
import { Storage, pack } from '$lib/storage';
import { Rules } from './rules';

const APP_URL = chrome.runtime.getURL('index.html');

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

// ------------------- BLOCKING -------------------

const recordAttempt = async (domain: string) => {
	const sessions = await Storage.get('sessions');
	const session = sessions.findLast((s) => s.end === null);
	if (!session) return;

	const attempts = await Storage.get('blockAttempts');
	attempts.push({ sessionId: session.id, domain, time: new Date(), overridden: false, reason: null });
	await Storage.set('blockAttempts', attempts);
	console.log(`[worker] blocked: ${domain}`);
};

// ------------------- APP TAB -------------------

const openApp = async () => {
	const [tab] = await chrome.tabs.query({ url: APP_URL });
	if (!tab?.id) {
		await chrome.tabs.create({ url: APP_URL });
		return;
	}
	await chrome.tabs.update(tab.id, { active: true });
	await chrome.windows.update(tab.windowId, { focused: true });
};

chrome.action.onClicked.addListener(openApp);

// ------------------- MESSAGES -------------------

const handle = async (message: Message): Promise<unknown> => {
	switch (message.type) {
		case 'start':       return startSession(message.profileId, message.planned);
		case 'stop':        return stopSession();
		case 'getState':    return getState();
		case 'blocked':     return recordAttempt(message.domain);
		case 'openApp':     return openApp();
	}
};

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
	queue(() => handle(message)).then((result) => sendResponse(pack(result)));
	return true;
});

chrome.runtime.onInstalled.addListener(() => {
	console.log('[worker] installed');
});
