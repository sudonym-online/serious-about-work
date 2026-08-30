<script>
	const forceLock = async () => {
		try {
			await document.documentElement.requestFullscreen();
		} catch (error) {
			console.log(error);
		}
	};
</script>

<h1>Serious About Work</h1>

<button onclick={forceLock}>start session</button>
