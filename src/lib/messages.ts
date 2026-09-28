import type { Profile, Session } from '$lib/types';
import { unpack } from '$lib/storage';

export type Message =
	| { type: 'start'; profileId: string; planned: number | null }
	| { type: 'stop' }
	| { type: 'getState' }
	| { type: 'blocked'; domain: string }
	| { type: 'openApp' };

export interface State {
	profile:            Profile | null;
	session:            Session | null;
}

// Responses cross the message channel as JSON, so dates come back as numbers.
export const send = async <R = void>(message: Message): Promise<R> =>
	unpack(await chrome.runtime.sendMessage(message)) as R;
