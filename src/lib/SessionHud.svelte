<script lang="ts">
	import type { Timeline } from '$lib/timeline.svelte';
	import TimelineView from '$lib/TimelineView.svelte';

	const fmt = (ms: number) => {
		const m = Math.floor(ms / 60000);
		return `${m}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
	};

	let {
		timeline,
		profileName,
		sessLength,
		tenths,
		jitter,
		domainTimes,
		onStop
	}: {
		timeline: Timeline;
		profileName: string;
		sessLength: number;
		tenths: number;
		jitter: string;
		domainTimes: [string, number][];
		onStop: () => void;
	} = $props();
</script>

<div class="hud">
	<div class="status">
		<h2 class="session">SESSION ACTIVE</h2>
		<p class="profile">{profileName}</p>
		<p class="length">Session Length: {Math.floor(sessLength / 1000)}.{tenths}{jitter} seconds</p>
		<button onclick={onStop}>stop session</button>
		{#if domainTimes.length}
			<ul class="domains">
				{#each domainTimes as [domain, ms] (domain)}
					<li>{domain} {fmt(ms)}</li>
				{/each}
			</ul>
		{/if}
	</div>
	<TimelineView {timeline} />
</div>
