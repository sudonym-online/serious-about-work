<script lang="ts">
	import type { Task } from '$lib/types';

	let { task, onAdvance }: { task: Task; onAdvance: (task: Task) => void } = $props();
</script>

<div class="task-row">
	<span>{task.name}</span>
	{#if task.description}
		<span>{task.description}</span>
	{/if}
	<div class="task-meta">
		{#if task.due}
			<span>{task.due.toLocaleDateString()}</span>
		{/if}
		<button onclick={() => onAdvance(task)} disabled={task.status === 'done'}>
			{task.status}
		</button>
	</div>
</div>
