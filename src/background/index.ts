// The extension service worker. Chrome starts it on events and stops it when idle,
// so all state lives in chrome.storage and every listener is registered at the top level.
import type { Message, State } from '$lib/messages';
import { Storage, pack } from '$lib/storage';

const APP_URL = chrome.runtime.getURL('index.html');

// Events can fire together. One chain keeps each read-modify-write on storage whole.
let chain: Promise<unknown> = Promise.resolve();
const queue = <T>(fn: () => Promise<T>): Promise<T> => {
	const next = chain.then(fn, fn);
	chain = next.catch(() => {});
	return next;
};

// ------------------- SESSION -------------------

const startSession = async (taskId: string) => {
	const sessions = await Storage.get('sessions');
	sessions.push({ taskId, start: new Date(), end: null });
	await Storage.set('sessions', sessions);
	await Storage.set('activeTaskId', taskId);
	console.log(`[worker] session started: ${taskId}`);
};

const stopSession = async () => {
	const activeTaskId = await Storage.get('activeTaskId');
	if (!activeTaskId) return;

	const sessions = await Storage.get('sessions');
	const session = sessions.findLast((s) => s.end === null);
	if (session) session.end = new Date();
	await Storage.set('sessions', sessions);
	await Storage.set('activeTaskId', null);
	console.log(`[worker] session stopped: ${activeTaskId}`);
};

const switchTask = async (taskId: string) => {
	await stopSession();
	await startSession(taskId);
};

const getState = async (): Promise<State> => {
	const { tasks, activeTaskId, sessions } = await Storage.getAll();
	return {
		task:       tasks.find((t) => t.id === activeTaskId) ?? null,
		session:    sessions.findLast((s) => s.end === null) ?? null
	};
};

// ------------------- MESSAGES -------------------

const handle = async (message: Message): Promise<unknown> => {
	switch (message.type) {
		case 'start':       return startSession(message.taskId);
		case 'stop':        return stopSession();
		case 'switchTask':  return switchTask(message.taskId);
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
