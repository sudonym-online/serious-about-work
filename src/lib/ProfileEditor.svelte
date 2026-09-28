<script lang="ts">
	import type { Profile } from '$lib/types';
	import DomainInput from '$lib/DomainInput.svelte';

	let {
		profile,
		onChange,
		onDelete
	}: { profile: Profile; onChange: () => void; onDelete: (profile: Profile) => void } = $props();

	let mode = $derived(profile.allowed.length > 0 ? 'whitelist' : 'blacklist');
</script>

<div class="profile-editor">
	<input type="text" placeholder="Profile name" bind:value={profile.name} onchange={onChange} />

	<p class="mode">
		{mode} mode:
		{mode === 'whitelist'
			? 'blocks every site not on the whitelist'
			: 'blocks only the sites on the blacklist'}
	</p>

	<label>
		<span>whitelist</span>
		<DomainInput domains={profile.allowed} placeholder="github.com" {onChange} />
	</label>

	<label>
		<span>blacklist</span>
		<DomainInput domains={profile.blocked} placeholder="youtube.com" {onChange} />
	</label>

	<button onclick={() => onDelete(profile)}>delete profile</button>
</div>
