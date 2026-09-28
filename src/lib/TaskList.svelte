<script lang="ts">
	import type { Draft, Log, SortKey, Status, Task } from '$lib/types';
	import { session } from '$lib/session.svelte';
	import AddTaskRow from '$lib/AddTaskRow.svelte';
	import TaskRow from '$lib/TaskRow.svelte';
	import TaskSortBar from '$lib/TaskSortBar.svelte';

	let {
		logs,
		terminating,
		profileId
	}: { logs: Log[]; terminating: boolean; profileId: string } = $props();

	const sortKeys: SortKey[] = ['added', 'date', 'status', 'name'];
	const statusOrder: Record<Status, number> = { todo: 0, 'in-progress': 1, done: 2 };

	let tasks = $derived(session.tasks.filter((t) => t.profileId === profileId));
	let sortKey: SortKey = $state('added');
	let sortReversed = $state(false);
	let addingTask = $state(false);

	let draft: Draft = $state({
		name: '',
		description: '',
		due: '',
		status: 'todo'
	});

	let sortedTasks = $derived.by(() => {
		const dir = sortReversed ? -1 : 1;
		switch (sortKey) {
			case 'name':
				return tasks.toSorted((a, b) => dir * a.name.localeCompare(b.name));
			case 'status':
				return tasks.toSorted((a, b) => dir * (statusOrder[a.status] - statusOrder[b.status]));
			case 'date':
				return tasks.toSorted((a, b) => {
					if (!a.due || !b.due) return Number(!a.due) - Number(!b.due);
					return dir * (a.due.getTime() - b.due.getTime());
				});
			default:
				return sortReversed ? tasks.toReversed() : tasks;
		}
	});

	const setSort = (key: SortKey) => {
		if (key === sortKey) {
			sortReversed = !sortReversed;
		} else {
			sortKey = key;
			sortReversed = false;
		}
	};

	const log = (content: string, date: Date, color: string) => {
		logs.push({ content, date, color });
	};

	const showAddTaskDialog = () => {
		if (terminating) return;
		addingTask = true;
	};

	const resetDraft = () => {
		draft = {
			name: '',
			description: '',
			due: '',
			status: 'todo'
		};
	};

	const commitDraft = () => {
		if (!addingTask) return;
		addingTask = false;

		if (!draft.name && !draft.description && !draft.due) {
			resetDraft();
			return;
		}

		const now = new Date();
		session.tasks.unshift({
			id: crypto.randomUUID(),
			profileId,
			name: draft.name || 'Untitled Task',
			description: draft.description,
			due: draft.due ? new Date(`${draft.due}T00:00`) : null,
			status: draft.status,
			completed: draft.status === 'done' ? now : null
		});
		session.saveTasks();
		log(`task added: ${session.tasks[0].name}`, now, 'blue');
		resetDraft();
	};

	const advanceStatus = (task: Task) => {
		if (task.status === 'done') return;

		const now = new Date();
		if (task.status === 'todo') {
			task.status = 'in-progress';
			log(`task in progress: ${task.name}`, now, 'blue');
		} else {
			task.status = 'done';
			task.completed = now;
			log(`task done: ${task.name}`, now, 'green');
		}
		session.saveTasks();
	};

	const removeTask = (task: Task) => {
		session.tasks = session.tasks.filter((t) => t.id !== task.id);
		session.saveTasks();
	};
</script>

<div class="tasks">
	<div class="task-list">
		<button class="add-btn" onclick={showAddTaskDialog}>new task</button>

		<div class="task-items">
			{#if addingTask}
				<AddTaskRow {draft} onCommit={commitDraft} />
			{/if}

			{#each sortedTasks as task (task.id)}
				<TaskRow {task} onAdvance={advanceStatus} onRemove={removeTask} />
			{/each}
		</div>
	</div>

	<TaskSortBar {sortKeys} {sortKey} {sortReversed} onSort={setSort} />
</div>
