<script>
	const forceLock = async () => {
		try {
			await document.documentElement.requestFullscreen();

			if ('keyboard' in navigator) {
				await navigator.keyboard.lock(['Escape']);
			}
		} catch (error) {
			console.log(error);
		}
	};
</script>

<h1>Serious About Work</h1>

<button onclick={forceLock}>start session</button>
