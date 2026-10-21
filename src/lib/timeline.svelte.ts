import type { TimelineEvent } from '$lib/types';

export const PX_PER_MINUTE = 24;
export const WIDTH = 600;
export const MAJOR_EVERY = 10;
const SINGLE_PX = 4;

const MINUTE = 60_000;
const WINDOW_MINUTES = Math.ceil(WIDTH / PX_PER_MINUTE);

export interface Tick {
	minute: number;
	right: number;
	major: boolean;
}

export interface Mark {
	id: number;
	right: number;
	width: number;
	kind: 'session' | 'attempt' | 'override' | 'task' | 'task-bar';
}

export interface Tip {
	title: string;
	lines: string[];
}

const formatDuration = (ms: number) => {
	const seconds = Math.floor(ms / 1000);
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export class Timeline {
	now = $state(Date.now());

	private source: () => TimelineEvent[];
	events: TimelineEvent[] = $derived.by(() => this.source());

	constructor(source: () => TimelineEvent[]) {
		this.source = source;
	}

	private toRight = (time: number) => ((this.now - time) / MINUTE) * PX_PER_MINUTE;

	ticks: Tick[] = $derived.by(() => {
		const last = Math.floor(this.now / MINUTE);
		const ticks: Tick[] = [];
		for (let minute = last; minute >= last - WINDOW_MINUTES; minute--) {
			ticks.push({
				minute,
				right: this.toRight(minute * MINUTE),
				major: minute % MAJOR_EVERY === 0
			});
		}
		return ticks;
	});

	marks: Mark[] = $derived.by(() => {
		const marks: Mark[] = [];
		this.events.forEach((event, id) => {
			if (event.kind === 'session') {
				const start = event.session.start.getTime();
				const end = event.session.end?.getTime() ?? this.now;
				const right = this.toRight(end);
				if (right > WIDTH) return;
				marks.push({ id, right, width: ((end - start) / MINUTE) * PX_PER_MINUTE, kind: 'session' });
				return;
			}
			if (event.kind === 'task' && event.task.started) {
				const start = event.task.started.getTime();
				const end = event.task.completed?.getTime() ?? this.now;
				const right = this.toRight(end);
				if (right > WIDTH) return;
				marks.push({ id, right, width: ((end - start) / MINUTE) * PX_PER_MINUTE, kind: 'task-bar' });
				return;
			}
			const time = event.kind === 'attempt' ? event.attempt.time : event.task.completed!;
			const right = this.toRight(time.getTime()) - SINGLE_PX / 2;
			if (right > WIDTH) return;
			const kind = event.kind === 'attempt' && event.attempt.overridden ? 'override' : event.kind;
			marks.push({ id, right, width: SINGLE_PX, kind });
		});
		return marks;
	});

	describe(id: number): Tip {
		const event = this.events[id];
		if (event.kind === 'attempt') {
			const { domain, time, overridden, reason } = event.attempt;
			return {
				title: domain,
				lines: [overridden ? `override: ${reason}` : 'blocked', time.toLocaleTimeString()]
			};
		}
		if (event.kind === 'task') {
			const { name, status, started, completed } = event.task;
			if (!started) return { title: name, lines: [status, completed!.toLocaleTimeString()] };
			const end = completed?.getTime() ?? this.now;
			return {
				title: name,
				lines: [
					status,
					`${started.toLocaleTimeString()} - ${completed?.toLocaleTimeString() ?? 'now'}`,
					formatDuration(end - started.getTime())
				]
			};
		}
		const { profile, session } = event;
		const end = session.end?.getTime() ?? this.now;
		return {
			title: profile.name,
			lines: [
				session.end ? 'ended' : 'in progress',
				`${session.start.toLocaleTimeString()} - ${session.end?.toLocaleTimeString() ?? 'now'}`,
				formatDuration(end - session.start.getTime())
			]
		};
	}
}
