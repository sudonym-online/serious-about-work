<script lang="ts">
	import type { Log } from '$lib/types';

	let { logs }: { logs: Log[] } = $props();
</script>

<div class="logs">
	{#each logs as log (log)}
		<div class="log" style="color: {log.color};">
			<p>[{log.date.toLocaleTimeString()}] {log.content}</p>
		</div>
	{/each}
</div>
