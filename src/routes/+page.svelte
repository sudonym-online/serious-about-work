<script>
	let fullscreen = $state(false);
	let terminating = $state(false);

	const forceLock = async () => {
		try {
			await document.documentElement.requestFullscreen();
			fullscreen = true;

			if ('keyboard' in navigator) {
				await navigator.keyboard.lock(['Escape']);
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

	const handleKeyDown = (event) => {
		if (event.key === 'Escape' && fullscreen) {
			terminating = true;
		}
	}
	const handleKeyUp = (event) => {
		if (event.key === 'Escape' && fullscreen) {
			terminating = false;
		}
	}

	$effect(() => {
		document.addEventListener('fullscreenchange', changeFullscreen);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);

		return () => {
			document.removeEventListener('fullscreenchange', changeFullscreen);
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
		}
	});

</script>

<h1>SERIOUS ABOUT WORK</h1>

{#if fullscreen}
	<h2 class="session">SESSION ACTIVE</h2>
{/if}

{#if terminating}
	<h2 class="terminate">TERMINATING SESSION</h2>
{/if}

<button onclick={forceLock}>start session</button>
