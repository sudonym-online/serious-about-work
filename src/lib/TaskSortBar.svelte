<script lang="ts">
	import type { SortKey } from '$lib/types';

	let {
		sortKeys,
		sortKey,
		sortReversed,
		onSort
	}: {
		sortKeys: SortKey[];
		sortKey: SortKey;
		sortReversed: boolean;
		onSort: (key: SortKey) => void;
	} = $props();
</script>

<div class="task-sort">
	<span>sort:</span>
	{#each sortKeys as key (key)}
		<button onclick={() => onSort(key)} aria-pressed={sortKey === key}>
			{key}{sortKey === key ? (sortReversed ? ' ↓' : ' ↑') : ''}
		</button>
	{/each}
</div>
