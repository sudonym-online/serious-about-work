<script lang="ts">
	import type { Task } from '$lib/types';

	let {
		task,
		onAdvance,
		onRemove
	}: {
		task: Task;
		onAdvance: (task: Task) => void;
		onRemove: (task: Task) => void;
	} = $props();
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
		<button onclick={() => onRemove(task)} aria-label="remove {task.name}">×</button>
	</div>
</div>
