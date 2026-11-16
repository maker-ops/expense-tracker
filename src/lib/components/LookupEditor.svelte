<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiError } from '#lib/api.ts';
	import { toast } from '#lib/state.svelte.ts';

	type Item = { id: number; name: string; color?: string; icon?: string; archived?: boolean };
	let {
		type,
		label,
		items,
		hasColor = false,
		hasIcon = false,
		canArchive = true
	}: {
		type: 'people' | 'groups' | 'categories';
		label: string;
		items: Item[];
		hasColor?: boolean;
		hasIcon?: boolean;
		canArchive?: boolean;
	} = $props();

	let newName = $state('');
	let newIcon = $state('');
	let newColor = $state('#6366f1');
	let showArchived = $state(false);

	async function run(fn: () => Promise<unknown>) {
		try {
			await fn();
			await invalidateAll();
		} catch (e) {
			toast((e as ApiError).message, { error: true });
		}
	}
	const patch = (id: number, body: object) => run(() => api('PATCH', `/api/lookup/${type}/${id}`, body));
	const add = () =>
		newName.trim() &&
		run(async () => {
			await api('POST', `/api/lookup/${type}`, { name: newName, color: newColor, icon: newIcon || undefined });
			newName = '';
			newIcon = '';
		});
	const remove = (it: Item) => {
		if (confirm(`Delete "${it.name}"?`)) run(() => api('DELETE', `/api/lookup/${type}/${it.id}`));
	};

	const shown = $derived(items.filter((i) => showArchived || !i.archived));
	const archivedCount = $derived(items.filter((i) => i.archived).length);
</script>

<section class="card p-4">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted">{label}</h2>
		{#if archivedCount}
			<button class="text-xs text-muted underline" onclick={() => (showArchived = !showArchived)}>
				{showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
			</button>
		{/if}
	</div>
	<ul class="space-y-2">
		{#each shown as it (it.id)}
			<li class="flex items-center gap-2 {it.archived ? 'opacity-50' : ''}">
				{#if hasColor}
					<input type="color" value={it.color} class="h-9 w-9 shrink-0 cursor-pointer !p-0.5" aria-label="{it.name} colour" onchange={(e) => patch(it.id, { color: e.currentTarget.value })} />
				{/if}
				{#if hasIcon}
					<input value={it.icon} class="w-12 shrink-0 text-center" maxlength="4" aria-label="{it.name} icon" onchange={(e) => patch(it.id, { icon: e.currentTarget.value })} />
				{/if}
				<input value={it.name} class="min-w-0 flex-1" aria-label="Name" maxlength="60" onchange={(e) => patch(it.id, { name: e.currentTarget.value })} />
				{#if canArchive}
					<button class="btn px-2.5 text-xs" onclick={() => patch(it.id, { archived: !it.archived })}>{it.archived ? 'Restore' : 'Archive'}</button>
				{:else}
					<button class="btn btn-danger px-2.5 text-xs" onclick={() => remove(it)} aria-label="Delete {it.name}">✕</button>
				{/if}
			</li>
		{/each}
	</ul>
	<form
		class="mt-3 flex items-center gap-2 border-t border-line pt-3"
		onsubmit={(e) => {
			e.preventDefault();
			add();
		}}
	>
		{#if hasColor}<input type="color" bind:value={newColor} class="h-10 w-10 shrink-0 cursor-pointer !p-0.5" aria-label="New colour" />{/if}
		{#if hasIcon}<input bind:value={newIcon} placeholder="🙂" class="w-12 shrink-0 text-center" maxlength="4" aria-label="New icon" />{/if}
		<input bind:value={newName} placeholder="Add new…" class="min-w-0 flex-1" maxlength="60" aria-label="New {label} name" />
		<button class="btn btn-primary" disabled={!newName.trim()}>Add</button>
	</form>
</section>
