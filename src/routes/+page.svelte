<script lang="ts">
	import { goto } from '$app/navigation';
	import CalendarGrid from '#lib/components/CalendarGrid.svelte';
	import EntryRow from '#lib/components/EntryRow.svelte';
	import { addMonths, daysInMonth, dayLabel, money, monthLabel, thisMonth, todayStr } from '#lib/format.ts';
	import { makeTapCounter } from '#lib/secret.ts';

	let { data } = $props();

	const cur = $derived<string>(data.currency);
	const totals = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const r of data.rows) m[r.date] = (m[r.date] ?? 0) + r.amountCents;
		return m;
	});
	const total = $derived<number>(data.rows.reduce((a: number, r: any) => a + r.amountCents, 0));
	// For the running month, average over the days elapsed so far; otherwise the whole month.
	const divisor = $derived(data.month === thisMonth() ? Number(todayStr().slice(8)) : daysInMonth(data.month));
	const avg = $derived(Math.round(total / divisor));

	let picked = $state<string | null>(null);
	const selected = $derived.by(() => {
		if (picked && picked.startsWith(data.month)) return picked;
		const t = todayStr();
		return t.startsWith(data.month) ? t : null;
	});
	const dayRows = $derived(selected ? data.rows.filter((r: any) => r.date === selected) : []);
	const dayTotal = $derived(dayRows.reduce((a: number, r: any) => a + r.amountCents, 0));

	function nav(month: string, person: number | null, group: number | null) {
		const q = new URLSearchParams();
		if (month !== thisMonth()) q.set('month', month);
		if (person) q.set('person', String(person));
		if (group) q.set('group', String(group));
		const s = q.toString();
		goto(s ? `/?${s}` : '/', { reset: false });
	}
	const shift = (d: number) => nav(addMonths(data.month, d), data.person, data.group);
	const tap = makeTapCounter();
</script>

<svelte:head><title>Calendar</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<button class="btn px-4" aria-label="Previous month" onclick={() => shift(-1)}>‹</button>
		<h1 class="text-lg font-bold">{monthLabel(data.month)}</h1>
		<button class="btn px-4" aria-label="Next month" onclick={() => shift(1)}>›</button>
	</div>

	<div class="card grid grid-cols-2 divide-x divide-line text-center">
		<div class="p-3">
			<p class="text-xs uppercase tracking-wide text-muted">Month total</p>
			<!-- 5 quick taps here open the hidden PIN prompt; it looks like plain text on purpose -->
			<p class="nohold text-2xl font-black tabular-nums" data-testid="month-total" role="presentation" onclick={tap}>{money(total, cur)}</p>
		</div>
		<div class="p-3">
			<p class="text-xs uppercase tracking-wide text-muted">Daily average</p>
			<p class="text-2xl font-black tabular-nums" data-testid="daily-avg">{money(avg, cur)}</p>
		</div>
	</div>

	<div class="flex gap-2">
		<select class="w-full" aria-label="Person" value={data.person ?? ''} onchange={(e) => nav(data.month, Number(e.currentTarget.value) || null, data.group)}>
			<option value="">All people</option>
			{#each data.people.filter((p: any) => !p.archived || p.id === data.person) as p}<option value={p.id}>{p.name}</option>{/each}
		</select>
		<select class="w-full" aria-label="Group" value={data.group ?? ''} onchange={(e) => nav(data.month, data.person, Number(e.currentTarget.value) || null)}>
			<option value="">All groups</option>
			{#each data.groups.filter((g: any) => !g.archived || g.id === data.group) as g}<option value={g.id}>{g.icon} {g.name}</option>{/each}
		</select>
	</div>

	<CalendarGrid month={data.month} {totals} {selected} onselect={(d) => (picked = d)} onswipe={shift} />

	{#if selected}
		<section class="card divide-y divide-line" aria-label="Selected day">
			<div class="flex items-baseline justify-between px-4 py-2.5">
				<h2 class="font-bold">{dayLabel(selected)}</h2>
				<span class="font-bold tabular-nums">{money(dayTotal, cur)}</span>
			</div>
			{#each dayRows as r (r.id)}
				<EntryRow entry={r} />
			{:else}
				<p class="p-5 text-center text-sm text-muted">No expenses on this day.</p>
			{/each}
		</section>
	{:else}
		<p class="text-center text-sm text-muted">Tap a day to see its expenses.</p>
	{/if}
</div>
