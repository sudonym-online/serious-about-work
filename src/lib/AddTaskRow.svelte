<script lang="ts">
	import type { Draft } from '$lib/types';

	let { draft, onCommit }: { draft: Draft; onCommit: () => void } = $props();

	const handleFocusOut = (event: FocusEvent) => {
		const row = event.currentTarget as HTMLElement;
		if (row.contains(event.relatedTarget as Node | null)) return;
		onCommit();
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') onCommit();
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="task-row" onfocusout={handleFocusOut} onkeydown={handleKeyDown}>
	<input type="text" placeholder="Name" bind:value={draft.name} {@attach (el) => el.focus()} />
	<input type="text" placeholder="Description" bind:value={draft.description} />
	<div class="task-meta">
		<input type="date" bind:value={draft.due} />
		<select bind:value={draft.status}>
			<option value="todo">Todo</option>
			<option value="in-progress">In Progress</option>
			<option value="done">Done</option>
		</select>
		<button class="add-btn" onclick={onCommit}>add task</button>
	</div>
</div>
