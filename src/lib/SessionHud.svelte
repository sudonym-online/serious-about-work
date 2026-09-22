<script lang="ts">
	import type { Timeline } from '$lib/timeline.svelte';
	import TimelineView from '$lib/TimelineView.svelte';

	let {
		timeline,
		sessLength,
		tenths,
		jitter
	}: { timeline: Timeline; sessLength: number; tenths: number; jitter: string } = $props();
</script>

<div class="hud">
	<div class="status">
		<h2 class="session">SESSION ACTIVE</h2>
		<p class="length">Session Length: {Math.floor(sessLength / 1000)}.{tenths}{jitter} seconds</p>
	</div>
	<TimelineView {timeline} />
</div>
