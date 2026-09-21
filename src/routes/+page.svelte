<script lang="ts">
	import type { Status, Task, NavigatorWithKeyboardLock, Log, SortKey } from '$lib/types';
	import { Timeline } from '$lib/timeline.svelte';
	import TimelineView from '$lib/TimelineView.svelte';

	const timeline = new Timeline();

	let fullscreen = $state(false);
	let terminating = $state(false);
	let disableFullscreenLock = $state(true);
	let addingTask = $state(false);
	let sessLength = $state(0);
	let tenths = $state(0);
	let jitter = $state('00');
	let logs: Log[] = $state([]);

	let draft = $state({
		name: '',
		description: '',
		due: '',
		status: 'todo' as Status
	});

	let tasks: Task[] = $state([]);

	const sortKeys: SortKey[] = ['added', 'date', 'status', 'name'];
	const statusOrder: Record<Status, number> = { todo: 0, 'in-progress': 1, done: 2 };
	let sortKey: SortKey = $state('added');
	let sortReversed = $state(false);

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
	}

	const log = (content : string, date: Date, color: string) => {
		logs.push({
			content,
			date,
			color
		});
	}

	const startSession = () => {
		forceLock()
			.then(() => {
				log("session started", new Date(), "green")
			})
	}

	const forceLock = async () => {
		if (disableFullscreenLock) {
			fullscreen = true;
			return;
		}

		try {
			await document.documentElement.requestFullscreen();
			fullscreen = true;

			if ('keyboard' in navigator) {
				await (navigator as NavigatorWithKeyboardLock).keyboard.lock(['Escape']);
			}
		} catch (error) {
			console.log(error);
			fullscreen = false;
		}
	};

	const changeFullscreen = () => {
		fullscreen = !!document.fullscreenElement;
		if (!fullscreen) terminating = false;	
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && fullscreen) {
			terminating = true;
		}
	}
	const handleKeyUp = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && fullscreen) {
			terminating = false;
		}
	}

	const showAddtaskDialog = () => {
		if (!fullscreen) return;
		if (terminating) return;
		addingTask = true;
	}

	const resetDraft = () => {
		draft = {
			name: '',
			description: '',
			due: '',
			status: 'todo'
		};
	}

	const commitDraft = () => {
		if (!addingTask) return;
		addingTask = false;

		if (!draft.name && !draft.description && !draft.due) {
			resetDraft();
			return;
		}

		const now = new Date();
		tasks.unshift({
			name: draft.name || 'Untitled Task',
			description: draft.description,
			due: draft.due ? new Date(`${draft.due}T00:00`) : null,
			status: draft.status,
			start: draft.status === 'in-progress' ? now : null,
			end: null
		});
		const task = tasks[0];
		timeline.add('single', task, now);
		if (task.start) timeline.add('extended', task, now);
		log(`task added: ${task.name}`, now, 'blue');
		resetDraft();
	}

	const advanceStatus = (task: Task) => {
		if (task.status === 'done') return;

		const now = new Date();
		if (task.status === 'todo') {
			task.status = 'in-progress';
			task.start = now;
			timeline.add('extended', task, now);
			log(`task started: ${task.name}`, now, 'blue');
		} else {
			task.status = 'done';
			task.end = now;
			log(`task done: ${task.name}`, now, 'green');
		}
	}

	const handleDraftFocusOut = (event: FocusEvent) => {
		const row = event.currentTarget as HTMLElement;
		if (row.contains(event.relatedTarget as Node | null)) return;
		commitDraft();
	}

	const handleDraftKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') commitDraft();
	}

	$effect(() => {
		document.addEventListener('fullscreenchange', changeFullscreen);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		if (fullscreen) {
			const start = Date.now();
			const interval = setInterval(() => {
				timeline.now = Date.now();
				sessLength = timeline.now - start;
				tenths = Math.floor(sessLength / 100) % 10;
				jitter = String(Math.floor(Math.random() * 100)).padStart(2, '0');
			}, 1);

			return () => clearInterval(interval);
		}

		return () => {
			document.removeEventListener('fullscreenchange', changeFullscreen);
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
		}
	});

</script>

<!-- <h1>SERIOUS ABOUT WORK</h1> -->

{#if fullscreen}
	<div class="logs">
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each logs as log}
			<div class="log" style="color: {log.color};">
				<p>[{log.date.toLocaleTimeString()}] {log.content}</p>
			</div>
		{/each}

	</div>

	<div class="hud">
		<div class="status">
			<h2 class="session">SESSION ACTIVE</h2>
			<p class="length">Session Length: {Math.floor(sessLength / 1000)}.{tenths}{jitter} seconds</p>
		</div>
		<TimelineView {timeline} />
	</div>

	<div class="tasks">
		<div class="task-list">
			<button class="add-btn" onclick={showAddtaskDialog}>new task</button>

			<div class="task-items">
				{#if addingTask}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="task-row" onfocusout={handleDraftFocusOut} onkeydown={handleDraftKeyDown}>
						<input type="text" placeholder="Name" bind:value={draft.name} {@attach (el) => el.focus()} />
						<input type="text" placeholder="Description" bind:value={draft.description} />
						<div class="task-meta">
							<input type="date" bind:value={draft.due} />
							<select bind:value={draft.status}>
								<option value="todo">Todo</option>
								<option value="in-progress">In Progress</option>
								<option value="done">Done</option>
							</select>
							<button class="add-btn" onclick={commitDraft}>add task</button>
						</div>
					</div>
				{/if}

				<!-- eslint-disable-next-line svelte/require-each-key -->
				{#each sortedTasks as task}
					<div class="task-row">
						<span>{task.name}</span>
						{#if task.description}
							<span>{task.description}</span>
						{/if}
						<div class="task-meta">
							{#if task.due}
								<span>{task.due.toLocaleDateString()}</span>
							{/if}
							<button onclick={() => advanceStatus(task)} disabled={task.status === 'done'}>
								{task.status}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="task-sort">
			<span>sort:</span>
			{#each sortKeys as key (key)}
				<button onclick={() => setSort(key)} aria-pressed={sortKey === key}>
					{key}{sortKey === key ? (sortReversed ? ' ↓' : ' ↑') : ''}
				</button>
			{/each}
		</div>
	</div>
	
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}

{#if !fullscreen}
	<button onclick={startSession}>start session</button>
{/if}