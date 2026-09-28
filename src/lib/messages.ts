import type { Session, Task } from '$lib/types';
import { unpack } from '$lib/storage';

export type Message =
	| { type: 'start'; taskId: string }
	| { type: 'stop' }
	| { type: 'switchTask'; taskId: string }
	| { type: 'getState' };

export interface State {
	task:               Task | null;
	session:            Session | null;
}

// Responses cross the message channel as JSON, so dates come back as numbers.
export const send = async <R = void>(message: Message): Promise<R> =>
	unpack(await chrome.runtime.sendMessage(message)) as R;
