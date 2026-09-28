import type { Profile, Session, Task } from '$lib/types';
import { Storage } from '$lib/storage';

export class SessionState {
	profiles:           Profile[] =         $state([]);
	tasks:              Task[] =            $state([]);
	sessions:           Session[] =         $state([]);
	activeProfileId:    string | null =     $state(null);
	loaded =                                $state(false);

	active: Session | null = $derived(this.sessions.findLast((s) => s.end === null) ?? null);
	profile: Profile | null = $derived(
		this.profiles.find((p) => p.id === this.activeProfileId) ?? null
	);

	async load() {
		const all = await Storage.getAll();
		this.profiles = all.profiles;
		this.tasks = all.tasks;
		this.sessions = all.sessions;
		this.activeProfileId = all.activeProfileId;
		this.loaded = true;
	}

	listen(): () => void {
		return Storage.onChange((changes) => {
			if (changes.profiles) this.profiles = changes.profiles;
			if (changes.tasks) this.tasks = changes.tasks;
			if (changes.sessions) this.sessions = changes.sessions;
			if (changes.activeProfileId !== undefined) this.activeProfileId = changes.activeProfileId;
		});
	}

	saveProfiles() {
		return Storage.set('profiles', $state.snapshot(this.profiles) as Profile[]);
	}

	saveTasks() {
		return Storage.set('tasks', $state.snapshot(this.tasks) as Task[]);
	}
}

export const session = new SessionState();
