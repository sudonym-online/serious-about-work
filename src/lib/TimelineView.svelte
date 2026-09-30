<script lang="ts">
	import { WIDTH, type Timeline } from '$lib/timeline.svelte';

	let { timeline }: { timeline: Timeline } = $props();

	let hoveredId: number | null = $state(null);
	let tipX = $state(0);

	let tip = $derived(
		hoveredId !== null && timeline.marks.some((mark) => mark.id === hoveredId)
			? timeline.describe(hoveredId)
			: null
	);

	const trackPointer = (event: PointerEvent) => {
		tipX = event.clientX - (event.currentTarget as HTMLElement).getBoundingClientRect().left;
	};
</script>

<div class="timeline-wrap">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="timeline" style="width: {WIDTH}px;" onpointermove={trackPointer}>
		{#each timeline.marks as mark (mark.id)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="mark"
				style="right: {mark.right}px; width: {mark.width}px;"
				onpointerenter={() => (hoveredId = mark.id)}
				onpointerleave={() => (hoveredId = null)}
			></div>
		{/each}

		{#each timeline.ticks as tick (tick.minute)}
			<div class="tick" class:major={tick.major} style="right: {tick.right}px;"></div>
		{/each}
	</div>

	{#if tip}
		<div class="tip" style="left: {tipX}px;">
			<strong>{tip.title}</strong>
			{#each tip.lines as line, i (i)}
				<span>{line}</span>
			{/each}
		</div>
	{/if}
</div>
