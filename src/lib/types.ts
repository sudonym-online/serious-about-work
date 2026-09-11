export type Status = 'todo' | 'in-progress' | 'done';

export interface Task {
	name: string;
	description: string;
	due: Date;
	status: Status;
}

export interface Log {
	content: string;
	date: Date;
	color: string;
}

export interface NavigatorWithKeyboardLock extends Navigator {
	keyboard: { lock(keys: string[]): Promise<void> };
}
