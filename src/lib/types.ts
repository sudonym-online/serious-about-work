export type Status = 'todo' | 'in-progress' | 'done';

export type SortKey = 'added' | 'date' | 'status' | 'name';

export interface Profile {
	id:                 string;
	name:               string;
	whitelist:          string[];
	blacklist:          string[];
	deepMode:           boolean;
}

export interface Task {
	id:                 string;
	profileId:          string;
	name:               string;
	description:        string;
	due:                Date | null;
	status:             Status;
	completed:          Date | null;
}

export interface Session {
	id:                 string;
	profileId:          string;
	start:              Date;
	end:                Date | null;
	planned:            number | null;
}

export interface ActivitySample {
	sessionId:          string;
	domain:             string;
	start:              Date;
	end:                Date;
}

export interface OpenSample {
	sessionId:          string;
	domain:             string;
	start:              Date;
}

export interface BlockAttempt {
	sessionId:          string;
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

export interface TimelineEvent {
	profile: Profile;
	session: Session;
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
