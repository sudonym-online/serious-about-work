export type Status = 'todo' | 'in-progress' | 'done';

export type SortKey = 'added' | 'date' | 'status' | 'name';

export interface Task {
	name: string;
	description: string;
	due: Date | null;
	status: Status;
	start: Date | null;
	end: Date | null;
}

export type TimelineKind = 'single' | 'extended';

export interface TimelineEvent {
	kind: TimelineKind;
	task: Task;
	// single: the moment of the event. extended: the block reads task.start and task.end.
	time: Date;
}

export interface Log {
	content: string;
	date: Date;
	color: string;
}

export interface Draft {
	name: string;
	description: string;
	due: string;
	status: Status;
}

export interface NavigatorWithKeyboardLock extends Navigator {
	keyboard: { lock(keys: string[]): Promise<void> };
}
