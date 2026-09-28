<script lang="ts">
	import type { Timeline } from '$lib/timeline.svelte';
	import TimelineView from '$lib/TimelineView.svelte';

	let {
		timeline,
		profileName,
		sessLength,
		tenths,
		jitter,
		onStop
	}: {
		timeline: Timeline;
		profileName: string;
		sessLength: number;
		tenths: number;
		jitter: string;
		onStop: () => void;
	} = $props();
</script>

<div class="hud">
	<div class="status">
		<h2 class="session">SESSION ACTIVE</h2>
		<p class="profile">{profileName}</p>
		<p class="length">Session Length: {Math.floor(sessLength / 1000)}.{tenths}{jitter} seconds</p>
		<button onclick={onStop}>stop session</button>
	</div>
	<TimelineView {timeline} />
</div>
