<script lang="ts">
	import type { Settings } from '$lib/types';
	import { DEFAULT_SETTINGS, Storage } from '$lib/storage';
	import DomainInput from '$lib/DomainInput.svelte';

	let alwaysBlocked: string[] = $state([]);
	let settings: Settings = $state({ ...DEFAULT_SETTINGS });
	let loaded = $state(false);

	$effect(() => {
		Storage.getAll().then((all) => {
			alwaysBlocked = all.alwaysBlocked;
			settings = all.settings;
			loaded = true;
		});
	});

	const saveAlwaysBlocked = () => Storage.set('alwaysBlocked', $state.snapshot(alwaysBlocked));
	const saveSettings = () => Storage.set('settings', $state.snapshot(settings));
</script>

<div class="settings">
	<h2>settings</h2>

	{#if loaded}
		<label>
			<span>always blocked (no profile or override can allow these)</span>
			<DomainInput domains={alwaysBlocked} placeholder="reddit.com" onChange={saveAlwaysBlocked} />
		</label>

		<label class="check">
			<input type="checkbox" bind:checked={settings.allowLocalhost} onchange={saveSettings} />
			<span>allow localhost in whitelist mode</span>
		</label>
	{/if}
</div>
