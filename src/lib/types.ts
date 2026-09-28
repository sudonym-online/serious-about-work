export type Status = 'todo' | 'in-progress' | 'done';

export type SortKey = 'added' | 'date' | 'status' | 'name';

export interface Task {
	id:                 string;
	name:               string;
	description:        string;
	due:                Date | null;
	status:             Status;
	estimate:           number | null; // minutes
	allowedDomains:     string[];
}

export interface Session {
	taskId:             string;
	start:              Date;
	end:                Date | null;
}

export interface ActivitySample {
	taskId:             string;
	domain:             string;
	start:              Date;
	end:                Date;
}

export interface OpenSample {
	taskId:             string;
	domain:             string;
	start:              Date;
}

export interface BlockAttempt {
	taskId:             string;
	domain:             string;
	time:               Date;
	overridden:         boolean;
	reason:             string | null;
}

export interface Settings {
	idleSeconds:        number;
	overrideWaitSec:    number;
	overrideAllowMin:   number;
	breakMin:           number;
	allowLocalhost:     boolean;
}

export type TimelineKind = 'single' | 'extended';

export type TimelineEvent =
	| { kind: 'single'; task: Task; time: Date }
	| { kind: 'extended'; task: Task; session: Session };

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
