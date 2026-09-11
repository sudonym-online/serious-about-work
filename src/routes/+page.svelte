<script lang="ts">
	import type { Status, Task, NavigatorWithKeyboardLock, Log } from '$lib/types';

	let fullscreen = $state(false);
	let terminating = $state(false);
	let sessLength = $state(0);
	let logs: Log[] = $state([]);

	let draft = $state({
		name: '',
		description: '',
		due: '',
		status: 'todo' as Status
	});

	const canAdd = $derived(
		draft.name.trim().length 		> 0 ||
		draft.description.trim().length > 0 ||
		draft.due.trim().length 		> 0
	);

	let tasks: Task[] = $state([]);

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
				log("test log 123 tsaijdfhkjsadhfkh sadkfh", new Date(), "red")
				log("test log 123sdfasdf tsaijdfhkjsadhfkh sadkfh", new Date(), "red")
				log("test log 123 tsaijdsdaffhkjsadhfkh sadkfh", new Date(), "red")
				log("testlg23 tsaijjsadhfkh sadkfh", new Date(), "red")

			})
	}

	const forceLock = async () => {
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

	const addTask = () => {
		if (!fullscreen) return;
		if (terminating) return;
		if (!canAdd) return;

		tasks.push({ 
			name: draft.name || 'Untitled Task',
			description: draft.description || 'No Description',
			due: new Date(draft.due),
			status: draft.status
		});
		draft = {
			name: '',
			description: '',
			due: '',
			status: 'todo'
		};
	}

	$effect(() => {
		document.addEventListener('fullscreenchange', changeFullscreen);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		if (fullscreen) {
			const start = Date.now();
			const interval = setInterval(() => {
				sessLength = Date.now() - start;
			}, 100);

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

	<div class="status">
		<h2 class="session">SESSION ACTIVE</h2>
		<p class="length">Session Length: {sessLength/1000} seconds</p>
	</div>

	<div class="tasks">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Description</th>
					<th>Due</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				<!-- eslint-disable-next-line svelte/require-each-key -->
				{#each tasks as task}
					<tr>
						<td>{task.name}</td>
						<td>{task.description}</td>
						<td>{task.due.toLocaleDateString()}</td>
						<td>{task.status}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<th><input type="text" placeholder="Name" bind:value={draft.name} /></th>
					<th><input type="text" placeholder="Description" bind:value={draft.description} /></th>
					<th><input type="date" bind:value={draft.due} /></th>
					<th>
						<select bind:value={draft.status}>
							<option value="todo">Todo</option>
							<option value="in-progress">In Progress</option>
							<option value="done">Done</option>
						</select>
					</th>
				</tr>
			</tfoot>
		</table>

		{#if canAdd}
			<button class="add-btn" onclick={addTask}>add task</button>
		{/if}
	</div>
	
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}

{#if !fullscreen}
	<button onclick={startSession}>start session</button>
{/if}