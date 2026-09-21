import type { Task, TimelineEvent, TimelineKind } from '$lib/types';

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
	kind: TimelineKind;
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
	events: TimelineEvent[] = $state([]);
	now = $state(Date.now());

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
			if (event.kind === 'single') {
				const right = this.toRight(event.time.getTime());
				if (right <= WIDTH) marks.push({ id, kind: event.kind, right, width: 0 });
				return;
			}

			if (!event.task.start) return;
			const start = event.task.start.getTime();
			const end = event.task.end?.getTime() ?? this.now;
			const right = this.toRight(end);
			if (right > WIDTH) return;
			marks.push({ id, kind: event.kind, right, width: ((end - start) / MINUTE) * PX_PER_MINUTE });
		});
		return marks;
	});

	describe(id: number): Tip {
		const { kind, task, time } = this.events[id];
		if (kind === 'single' || !task.start) {
			return { title: task.name, lines: ['task added', time.toLocaleTimeString()] };
		}

		const end = task.end?.getTime() ?? this.now;
		return {
			title: task.name,
			lines: [
				task.end ? 'done' : 'in progress',
				`${task.start.toLocaleTimeString()} - ${task.end?.toLocaleTimeString() ?? 'now'}`,
				formatDuration(end - task.start.getTime())
			]
		};
	}

	add(kind: TimelineKind, task: Task, time: Date) {
		this.events.push({ kind, task, time });
	}
}
