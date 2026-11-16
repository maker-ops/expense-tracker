<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import { addMonths, money, monthLabel } from '#lib/format.ts';

	let { data } = $props();
	const colorOf = (list: any[], id: number | null) => list.find((x) => x.id === id)?.color;
</script>

<svelte:head><title>Stats</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<a class="btn px-4" aria-label="Previous month" href="?month={addMonths(data.month, -1)}">‹</a>
		<h1 class="text-lg font-bold">{monthLabel(data.month)}</h1>
		<a class="btn px-4" aria-label="Next month" href="?month={addMonths(data.month, 1)}">›</a>
	</div>

	<div class="card p-4 text-center">
		<p class="text-xs uppercase tracking-wide text-muted">Total spent</p>
		<p class="text-3xl font-black tabular-nums">{money(data.stats.total, data.currency)}</p>
	</div>

	<BarChart
		title="By person"
		currency={data.currency}
		items={data.stats.byPerson.map((i: any) => ({ ...i, color: colorOf(data.people, i.id) }))}
	/>
	<BarChart
		title="By group"
		currency={data.currency}
		items={data.stats.byGroup.map((i: any) => ({ ...i, color: colorOf(data.groups, i.id) }))}
	/>
	<BarChart title="By category" currency={data.currency} items={data.stats.byCategory} />
</div>
