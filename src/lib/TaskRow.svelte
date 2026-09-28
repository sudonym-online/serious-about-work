<script lang="ts">
	import type { Task } from '$lib/types';

	let {
		task,
		active,
		onAdvance,
		onStart
	}: {
		task: Task;
		active: boolean;
		onAdvance: (task: Task) => void;
		onStart: (task: Task) => void;
	} = $props();
</script>

<div class="task-row" class:active>
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
		<button onclick={() => onStart(task)} disabled={active || task.status === 'done'}>
			{active ? 'active' : 'start'}
		</button>
	</div>
</div>
