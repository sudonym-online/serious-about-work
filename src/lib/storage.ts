import type {
	ActivitySample,
	BlockAttempt,
	OpenSample,
	Profile,
	Session,
	Settings,
	Task
} from '$lib/types';

export interface Schema {
	profiles:           Profile[];
	tasks:              Task[];
	activeProfileId:    string | null;
	sessions:           Session[];
	samples:            ActivitySample[];
	openSample:         OpenSample | null;
	blockAttempts:      BlockAttempt[];
	alwaysBlocked:      string[];
	settings:           Settings;
}

export type Key = keyof Schema;

export const DEFAULT_SETTINGS: Settings = {
	idleSeconds:        60,
	overrideWaitSec:    30,
	overrideAllowMin:   10,
	breakMin:           5,
	allowLocalhost:     true
};

const DEFAULTS: Schema = {
	profiles:           [],
	tasks:              [],
	activeProfileId:    null,
	sessions:           [],
	samples:            [],
	openSample:         null,
	blockAttempts:      [],
	alwaysBlocked:      [],
	settings:           DEFAULT_SETTINGS
};

const DATE_FIELDS = new Set(['due', 'completed', 'start', 'end', 'time']);

export const pack = (value: unknown): unknown => {
	if (value instanceof Date) return value.getTime();
	if (Array.isArray(value)) return value.map(pack);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pack(v)]));
};

export const unpack = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(unpack);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value).map(([k, v]) => [
			k,
			DATE_FIELDS.has(k) && typeof v === 'number' ? new Date(v) : unpack(v)
		])
	);
};

export const Storage = {
	async get<K extends Key>(key: K): Promise<Schema[K]> {
		const result = await chrome.storage.local.get(key);
		if (result[key] === undefined) return structuredClone(DEFAULTS[key]);
		return unpack(result[key]) as Schema[K];
	},

	async getAll(): Promise<Schema> {
		const result = await chrome.storage.local.get(null);
		const all = structuredClone(DEFAULTS);
		for (const key of Object.keys(DEFAULTS) as Key[]) {
			if (result[key] !== undefined) Object.assign(all, { [key]: unpack(result[key]) });
		}
		return all;
	},

	set<K extends Key>(key: K, value: Schema[K]): Promise<void> {
		return chrome.storage.local.set({ [key]: pack(value) });
	},

	onChange(fn: (changes: Partial<Schema>) => void): () => void {
		const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
			if (area !== 'local') return;
			const out: Partial<Schema> = {};
			for (const [key, change] of Object.entries(changes)) {
				if (!(key in DEFAULTS)) continue;
				Object.assign(out, {
					[key]: change.newValue === undefined ? DEFAULTS[key as Key] : unpack(change.newValue)
				});
			}
			fn(out);
		};
		chrome.storage.onChanged.addListener(listener);
		return () => chrome.storage.onChanged.removeListener(listener);
	}
};
