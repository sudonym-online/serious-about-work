import type { Message, State } from '$lib/messages';
import type { Profile } from '$lib/types';
import { DEFAULT_SETTINGS, Storage, pack } from '$lib/storage';
import { Rules } from './rules';

const APP_URL = chrome.runtime.getURL('index.html');
const OVERRIDE_ALARM = 'override:';

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

// ------------------- MIGRATION -------------------

type OldProfile = Profile & { allowed?: string[]; blocked?: string[] };

chrome.runtime.onInstalled.addListener(() =>
	queue(async () => {
		const profiles = (await Storage.get('profiles')) as OldProfile[];
		if (profiles.every((p) => p.whitelist && p.blacklist)) return;
		for (const p of profiles) {
			p.whitelist ??= p.allowed ?? [];
			p.blacklist ??= p.blocked ?? [];
			delete p.allowed;
			delete p.blocked;
		}
		await Storage.set('profiles', profiles);
	})
);

// ------------------- SESSION -------------------

const startSession = async (profileId: string, planned: number | null) => {
	if (await Storage.get('activeProfileId')) return;

	const sessions = await Storage.get('sessions');
	sessions.push({ id: crypto.randomUUID(), profileId, start: new Date(), end: null, planned });
	await Storage.set('sessions', sessions);
	await Storage.set('activeProfileId', profileId);
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
	await chrome.alarms.clearAll();
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

// ------------------- OVERRIDE -------------------

const override = async (domain: string, reason: string) => {
	const sessions = await Storage.get('sessions');
	const session = sessions.findLast((s) => s.end === null);
	if (!session) return;

	const { overrideAllowMin } = await Storage.get('settings');
	const id = await Rules.addOverride(domain);
	await chrome.alarms.create(OVERRIDE_ALARM + id, {
		delayInMinutes: overrideAllowMin || DEFAULT_SETTINGS.overrideAllowMin
	});

	const attempts = await Storage.get('blockAttempts');
	const attempt = attempts.findLast(
		(a) => a.sessionId === session.id && a.domain === domain && !a.overridden
	);
	if (attempt) {
		attempt.overridden = true;
		attempt.reason = reason;
		await Storage.set('blockAttempts', attempts);
	}
	console.log(`[worker] override: ${domain} (${reason})`);
};

chrome.alarms.onAlarm.addListener(({ name }) => {
	if (!name.startsWith(OVERRIDE_ALARM)) return;
	queue(() => Rules.remove([Number(name.slice(OVERRIDE_ALARM.length))]));
});

chrome.runtime.onStartup.addListener(() =>
	queue(async () => {
		const alarms = new Set((await chrome.alarms.getAll()).map((a) => a.name));
		const orphans = (await Rules.overrideIds()).filter((id) => !alarms.has(OVERRIDE_ALARM + id));
		await Rules.remove(orphans);
	})
);

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
		case 'override':    return override(message.domain, message.reason);
		case 'openApp':     return openApp();
	}
};

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
	queue(() => handle(message)).then((result) => sendResponse(pack(result)));
	return true;
});
