<script lang="ts">
	import type { Log, Profile } from '$lib/types';
	import { session } from '$lib/session.svelte';
	import ProfileEditor from '$lib/ProfileEditor.svelte';
	import TaskList from '$lib/TaskList.svelte';

	let {
		logs,
		onStart
	}: { logs: Log[]; onStart: (profile: Profile, planned: number | null) => void } = $props();

	let selectedId: string | null = $state(session.profiles[0]?.id ?? null);
	let planned: number | null = $state(null);

	let selected = $derived(session.profiles.find((p) => p.id === selectedId) ?? null);

	const newProfile = () => {
		const profile: Profile = {
			id:         crypto.randomUUID(),
			name:       'New Profile',
			whitelist:  [],
			blacklist:  [],
			deepMode:   false
		};
		session.profiles.push(profile);
		session.saveProfiles();
		selectedId = profile.id;
	};

	const deleteProfile = (profile: Profile) => {
		session.profiles = session.profiles.filter((p) => p.id !== profile.id);
		session.tasks = session.tasks.filter((t) => t.profileId !== profile.id);
		session.saveProfiles();
		session.saveTasks();
		selectedId = session.profiles[0]?.id ?? null;
	};

	const start = () => {
		if (!selected) return;
		onStart(selected, planned && planned > 0 ? planned : null);
	};
</script>

<div class="start-menu">
	<div class="profiles">
		{#each session.profiles as profile (profile.id)}
			<button onclick={() => (selectedId = profile.id)} aria-pressed={profile.id === selectedId}>
				{profile.name}
			</button>
		{/each}
		<button class="add-btn" onclick={newProfile}>new profile</button>
	</div>

	{#if selected}
		<ProfileEditor profile={selected} onChange={session.saveProfiles.bind(session)} onDelete={deleteProfile} />

		<TaskList {logs} terminating={false} profileId={selected.id} />

		<div class="start">
			<label>
				<span>planned minutes</span>
				<input type="number" min="1" placeholder="none" bind:value={planned} />
			</label>
			<button onclick={start}>start session</button>
		</div>
	{:else}
		<p>make a profile to start.</p>
	{/if}
</div>
