import type { Session, Task } from '$lib/types';
import { Storage } from '$lib/storage';

// The worker owns the session. The app only mirrors storage and sends messages.
export class SessionState {
	tasks:          Task[] =            $state([]);
	sessions:       Session[] =         $state([]);
	activeTaskId:   string | null =     $state(null);
	loaded =                            $state(false);

	active: Session | null = $derived(this.sessions.findLast((s) => s.end === null) ?? null);
	task: Task | null = $derived(this.tasks.find((t) => t.id === this.activeTaskId) ?? null);

	async load() {
		const all = await Storage.getAll();
		this.tasks = all.tasks;
		this.sessions = all.sessions;
		this.activeTaskId = all.activeTaskId;
		this.loaded = true;
	}

	// Returns a function that removes the listener.
	listen(): () => void {
		return Storage.onChange((changes) => {
			if (changes.tasks) this.tasks = changes.tasks;
			if (changes.sessions) this.sessions = changes.sessions;
			if (changes.activeTaskId !== undefined) this.activeTaskId = changes.activeTaskId;
		});
	}

	saveTasks() {
		return Storage.set('tasks', $state.snapshot(this.tasks) as Task[]);
	}
}

export const session = new SessionState();
