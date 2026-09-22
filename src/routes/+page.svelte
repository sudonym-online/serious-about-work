<script lang="ts">
	import type { NavigatorWithKeyboardLock, Log } from '$lib/types';
	import { Timeline } from '$lib/timeline.svelte';
	import LogPanel from '$lib/LogPanel.svelte';
	import SessionHud from '$lib/SessionHud.svelte';
	import TaskList from '$lib/TaskList.svelte';

	const timeline = new Timeline();

	let fullscreen = $state(false);
	let terminating = $state(false);
	let disableFullscreenLock = $state(true);
	let sessLength = $state(0);
	let tenths = $state(0);
	let jitter = $state('00');
	let logs: Log[] = $state([]);

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
	<LogPanel {logs} />

	<SessionHud {timeline} {sessLength} {tenths} {jitter} />

	<TaskList {timeline} {logs} {terminating} />
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}

{#if !fullscreen}
	<button onclick={startSession}>start session</button>
{/if}