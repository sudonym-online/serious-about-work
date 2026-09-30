import type { TimelineEvent } from '$lib/types';

export const PX_PER_MINUTE = 24;
export const WIDTH = 600;
export const MAJOR_EVERY = 10;

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
		this.events.forEach(({ session }, id) => {
			const start = session.start.getTime();
			const end = session.end?.getTime() ?? this.now;
			const right = this.toRight(end);
			if (right > WIDTH) return;
			marks.push({ id, right, width: ((end - start) / MINUTE) * PX_PER_MINUTE });
		});
		return marks;
	});

	describe(id: number): Tip {
		const { profile, session } = this.events[id];
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
