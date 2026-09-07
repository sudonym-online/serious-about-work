<script lang="ts">
	let fullscreen = $state(false);
	let terminating = $state(false);
	let sessLength = $state(0);
	
	interface NavigatorWithKeyboardLock extends Navigator {
		keyboard: { lock(keys: string[]): Promise<void> };
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
	<h2 class="session">SESSION ACTIVE</h2>
	<p class="length">Session Length: {sessLength/1000} seconds</p>
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}

{#if !fullscreen}
	<button onclick={forceLock}>start session</button>
{/if}