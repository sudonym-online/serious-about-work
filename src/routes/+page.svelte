<script lang="ts">
	import type { NavigatorWithKeyboardLock, Log, Task, TimelineEvent } from '$lib/types';
	import { Timeline } from '$lib/timeline.svelte';
	import { session } from '$lib/session.svelte';
	import { send } from '$lib/messages';
	import LogPanel from '$lib/LogPanel.svelte';
	import SessionHud from '$lib/SessionHud.svelte';
	import TaskList from '$lib/TaskList.svelte';

	const timeline = new Timeline(() =>
		session.sessions.flatMap((s): TimelineEvent[] => {
			const task = session.tasks.find((t) => t.id === s.taskId);
			return task ? [{ kind: 'extended', task, session: s }] : [];
		})
	);

	let fullscreen = $state(false);
	let terminating = $state(false);
	let disableFullscreenLock = $state(true);
	let sessLength = $state(0);
	let tenths = $state(0);
	let jitter = $state('00');
	let logs: Log[] = $state([]);

	const log = (content: string, date: Date, color: string) => {
		logs.push({ content, date, color });
	};

	const startSession = async (task: Task) => {
		await forceLock();
		await send({ type: session.active ? 'switchTask' : 'start', taskId: task.id });
		log(`session started: ${task.name}`, new Date(), 'green');
	};

	const stopSession = async () => {
		await send({ type: 'stop' });
		if (document.fullscreenElement) await document.exitFullscreen();
		log('session stopped', new Date(), 'red');
	};

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
		if (event.key === 'Escape' && fullscreen) terminating = true;
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && fullscreen) terminating = false;
	};

	$effect(() => {
		session.load();
		return session.listen();
	});

	$effect(() => {
		document.addEventListener('fullscreenchange', changeFullscreen);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		return () => {
			document.removeEventListener('fullscreenchange', changeFullscreen);
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
		};
	});

	// The worker keeps the start time, so the length survives a closed tab.
	$effect(() => {
		const active = session.active;
		if (!active) return;

		const start = active.start.getTime();
		let frame = 0;
		const tick = () => {
			timeline.now = Date.now();
			sessLength = timeline.now - start;
			tenths = Math.floor(sessLength / 100) % 10;
			jitter = String(Math.floor(Math.random() * 100)).padStart(2, '0');
			frame = requestAnimationFrame(tick);
		};
		tick();

		return () => cancelAnimationFrame(frame);
	});
</script>

<!-- <h1>SERIOUS ABOUT WORK</h1> -->

{#if session.active}
	<LogPanel {logs} />

	<SessionHud
		{timeline}
		taskName={session.task?.name ?? ''}
		{sessLength}
		{tenths}
		{jitter}
		onStop={stopSession}
	/>
{/if}

{#if session.loaded}
	<TaskList {logs} {terminating} onStart={startSession} />
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}
