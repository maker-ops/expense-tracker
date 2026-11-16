<script lang="ts">
	import { money } from '#lib/format.ts';

	let {
		title,
		items,
		currency = 'EUR'
	}: { title: string; items: { name: string; total: number; count: number; color?: string }[]; currency?: string } = $props();

	const max = $derived(Math.max(1, ...items.map((i) => i.total)));
	const sum = $derived(items.reduce((a, i) => a + i.total, 0));
</script>

<section class="card p-4">
	<h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
	{#if !items.length}
		<p class="text-sm text-muted">No expenses this month.</p>
	{:else}
		<ul class="space-y-3">
			{#each items as it}
				<li>
					<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
						<span class="truncate font-medium">{it.name}</span>
						<span class="shrink-0 tabular-nums"
							>{money(it.total, currency)} <span class="text-xs text-muted">· {sum ? Math.round((it.total / sum) * 100) : 0}%</span></span
						>
					</div>
					<div class="h-2.5 overflow-hidden rounded-full bg-surface2">
						<div class="h-full rounded-full" style="width:{(it.total / max) * 100}%; background:{it.color ?? 'var(--accent)'}"></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
