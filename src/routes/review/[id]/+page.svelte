<script lang="ts">
	import { page } from '$app/state';
	import { session } from '$lib/session.svelte';
	import { formatDuration } from '$lib/timeline.svelte';

	const total = <T,>(items: T[], key: (t: T) => string, ms: (t: T) => number) => {
		const totals = new Map<string, number>();
		for (const t of items) totals.set(key(t), (totals.get(key(t)) ?? 0) + ms(t));
		return [...totals].sort((a, b) => b[1] - a[1]);
	};

	const lengthOf = (start: Date, end: Date | null) => (end?.getTime() ?? Date.now()) - start.getTime();

	const current = $derived(session.sessions.find((s) => s.id === page.params.id) ?? null);
	const profileName = $derived(
		session.profiles.find((p) => p.id === current?.profileId)?.name ?? '(deleted)'
	);
	const samples = $derived(session.samples.filter((s) => s.sessionId === current?.id));
	const attempts = $derived(session.blockAttempts.filter((a) => a.sessionId === current?.id));
	const finished = $derived.by(() => {
		if (!current) return [];
		const start = current.start.getTime();
		const end = current.end?.getTime() ?? Date.now();
		return session.tasks.filter(
			(t) =>
				t.profileId === current.profileId &&
				t.completed &&
				t.completed.getTime() >= start &&
				t.completed.getTime() <= end
		);
	});

	const actual = $derived(current ? lengthOf(current.start, current.end) : 0);
	const tracked = $derived(samples.reduce((sum, s) => sum + lengthOf(s.start, s.end), 0));
	const byDomain = $derived(total(samples, (s) => s.domain, (s) => lengthOf(s.start, s.end)));

	$effect(() => {
		session.load();
		return session.listen();
	});
</script>

<div class="review">
	{#if !session.loaded}
		<!-- loading -->
	{:else if !current}
		<h2>session not found</h2>
		<a href="#/">back</a>
	{:else}
		<h2>{profileName}</h2>
		<p>
			{current.start.toLocaleTimeString()} - {current.end?.toLocaleTimeString() ?? 'now'}
		</p>
		<p>
			planned {current.planned ? `${current.planned}m` : '—'}, actual {formatDuration(actual)}
		</p>
		<p>
			tracked {formatDuration(tracked)}, idle / untracked {formatDuration(Math.max(0, actual - tracked))}
		</p>

		<h3>time per domain</h3>
		<ul>
			{#each byDomain as [domain, ms] (domain)}
				<li>{domain} {formatDuration(ms)}</li>
			{:else}
				<li>no activity</li>
			{/each}
		</ul>

		<h3>blocks</h3>
		<p>{attempts.length} attempts, {attempts.filter((a) => a.overridden).length} overrides</p>
		<ul>
			{#each attempts as a, i (i)}
				<li>
					{a.domain} at {a.time.toLocaleTimeString()}{a.overridden ? ` (override: ${a.reason})` : ''}
				</li>
			{/each}
		</ul>

		<h3>finished tasks</h3>
		<ul>
			{#each finished as task (task.id)}
				<li>{task.name} at {task.completed?.toLocaleTimeString()}</li>
			{:else}
				<li>none</li>
			{/each}
		</ul>

		<a href="#/">back</a>
	{/if}
</div>
