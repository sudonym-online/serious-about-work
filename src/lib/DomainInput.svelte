<script lang="ts">
	let {
		domains,
		placeholder,
		onChange
	}: { domains: string[]; placeholder: string; onChange: () => void } = $props();

	let text = $state('');

	// "https://www.YouTube.com/watch" -> "youtube.com". A rule on a domain also covers its subdomains.
	const normalize = (input: string) =>
		input
			.trim()
			.toLowerCase()
			.replace(/^[a-z]+:\/\//, '')
			.split(/[/?#]/)[0]
			.replace(/^www\./, '');

	const add = () => {
		const domain = normalize(text);
		text = '';
		if (!domain || domains.includes(domain)) return;
		domains.push(domain);
		onChange();
	};

	const remove = (domain: string) => {
		domains.splice(domains.indexOf(domain), 1);
		onChange();
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') add();
	};
</script>

<div class="domain-input">
	{#each domains as domain (domain)}
		<span class="chip">
			{domain}
			<button onclick={() => remove(domain)} aria-label="remove {domain}">×</button>
		</span>
	{/each}
	<input type="text" {placeholder} bind:value={text} onkeydown={handleKeyDown} onblur={add} />
</div>
