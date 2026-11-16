<script lang="ts">
	import { page } from '$app/state';
	import { deleteEntry } from '#lib/actions.ts';
	import { fmtDate, money } from '#lib/format.ts';
	import { openForm, type Entry, type TitleSuggestion } from '#lib/state.svelte.ts';

	let {
		entry,
		kind = 'expense',
		showDate = false,
		titles,
		onchanged
	}: {
		entry: Entry;
		kind?: 'expense' | 'earning';
		showDate?: boolean;
		titles?: TitleSuggestion[];
		onchanged?: () => void | Promise<void>;
	} = $props();

	const person = $derived((page.data.people ?? []).find((p: any) => p.id === entry.personId));
	const group = $derived((page.data.groups ?? []).find((g: any) => g.id === entry.groupId));
	const category = $derived((page.data.categories ?? []).find((c: any) => c.id === entry.categoryId));
</script>

<div class="px-4 py-3">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="truncate font-semibold">{entry.title}</p>
			<p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
				{#if showDate}<span>{fmtDate(entry.date)}</span>{/if}
				{#if person}<span class="inline-flex items-center gap-1"><i class="h-2 w-2 rounded-full" style="background:{person.color}"></i>{person.name}</span>{/if}
				{#if group}<span>{group.icon} {group.name}</span>{/if}
				{#if category}<span>{category.icon} {category.name}</span>{/if}
			</p>
			{#if entry.note}<p class="mt-0.5 truncate text-xs italic text-muted">{entry.note}</p>{/if}
		</div>
		<p class="shrink-0 font-bold tabular-nums">{money(entry.amountCents, entry.currency)}</p>
	</div>
	<div class="mt-1.5 flex gap-4 text-xs font-semibold text-muted">
		<button class="py-1 hover:text-accent" onclick={() => openForm({ kind, mode: 'repeat', entry, titles, onsaved: onchanged })}>↻ Repeat</button>
		<button class="py-1 hover:text-accent" onclick={() => openForm({ kind, mode: 'edit', entry, titles, onsaved: onchanged })}>✎ Edit</button>
		<button class="py-1 hover:text-danger" onclick={() => deleteEntry(kind, entry, onchanged)}>🗑 Delete</button>
	</div>
</div>
