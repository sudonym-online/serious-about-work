<script>
	import '../app.css';
	import favicon from '$lib/assets/icon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="nav">
	<a href="#/">home</a>
	<a href="#/settings">settings</a>
</nav>

{@render children()}
