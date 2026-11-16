<script lang="ts">
	import { page } from '$app/state';
	import { api, clearEarningsToken, getEarningsToken } from '#lib/api.ts';
	import { addMonths, dayLabel, money, monthLabel, thisMonth, todayStr } from '#lib/format.ts';
	import { openForm, toast, ui, type Entry, type TitleSuggestion } from '#lib/state.svelte.ts';
	import { onMount } from 'svelte';
	import CalendarGrid from './CalendarGrid.svelte';
	import EntryRow from './EntryRow.svelte';

	type NetMonth = { month: string; earnings: number; expenses: number; net: number };

	const cur = $derived<string>(page.data.currency ?? 'EUR');
	let tab = $state<'list' | 'calendar' | 'net'>('list');
	let month = $state(thisMonth());
	let rows = $state<Entry[]>([]);
	let titles = $state<TitleSuggestion[]>([]);
	let net = $state<NetMonth[]>([]);
	let selected = $state<string | null>(todayStr());
	let now = $state(Date.now());
	let loaded = $state(false);

	const expiresAt = () => getEarningsToken()?.expiresAt ?? 0;
	const remaining = $derived(Math.max(0, expiresAt() - now));

	export function lock(msg = 'Locked') {
		clearEarningsToken();
		ui.vaultOpen = false;
		toast(msg);
	}

	async function load() {
		try {
			const [r, t, n] = await Promise.all([
				api<{ rows: Entry[] }>('GET', `/api/earnings?month=${month}`),
				api<{ titles: TitleSuggestion[] }>('GET', '/api/earnings/titles'),
				api<{ months: NetMonth[] }>('GET', `/api/earnings/net?year=${month.slice(0, 4)}`)
			]);
			rows = r.rows;
			titles = t.titles;
			net = n.months;
			loaded = true;
		} catch (e: any) {
			if (e.status === 404) lock('Locked');
		}
	}

	$effect(() => {
		month; // reload on month change
		load();
	});

	onMount(() => {
		const id = setInterval(() => {
			now = Date.now();
			if (!getEarningsToken()) lock('Locked');
		}, 1000);
		return () => clearInterval(id);
	});

	const totalsByDay = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const r of rows) m[r.date] = (m[r.date] ?? 0) + r.amountCents;
		return m;
	});
	const monthTotal = $derived(rows.reduce((a, r) => a + r.amountCents, 0));
	const dayRows = $derived(selected ? rows.filter((r) => r.date === selected) : []);
	const current = $derived(net.find((n) => n.month === month));
	const netMax = $derived(Math.max(1, ...net.map((n) => Math.max(n.earnings, n.expenses))));

	const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
	const add = () => openForm({ kind: 'earning', mode: 'add', titles, onsaved: load });
</script>

<div class="fixed inset-0 z-[55] overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="Private">
	<div class="sticky top-0 z-10 flex items-center gap-3 border-b border-amber-500/40 bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
		<span class="text-lg font-bold text-amber-500">🔓 Private</span>
		<span class="text-xs tabular-nums text-muted">locks in {mmss(remaining)}</span>
		<button class="btn ml-auto px-3 py-1.5 text-sm" onclick={() => lock()}>Lock</button>
	</div>

	<div class="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-4">
		<div class="flex items-center justify-between">
			<button class="btn px-3" aria-label="Previous month" onclick={() => (month = addMonths(month, -1))}>‹</button>
			<h1 class="font-bold">{monthLabel(month)}</h1>
			<button class="btn px-3" aria-label="Next month" onclick={() => (month = addMonths(month, 1))}>›</button>
		</div>

		<div class="flex gap-2" role="tablist">
			{#each [['list', 'Earnings'], ['calendar', 'Calendar'], ['net', 'Net']] as [k, label]}
				<button role="tab" class="chip flex-1 justify-center {tab === k ? '!border-accent' : ''}" aria-selected={tab === k} onclick={() => (tab = k as typeof tab)}>{label}</button>
			{/each}
		</div>

		{#if tab !== 'net'}
			<div class="card p-4 text-center">
				<p class="text-xs uppercase tracking-wide text-muted">Earned in {monthLabel(month)}</p>
				<p class="text-3xl font-black tabular-nums text-accent" data-testid="earn-total">{money(monthTotal, cur)}</p>
			</div>
		{/if}

		{#if tab === 'list'}
			<div class="card divide-y divide-line">
				{#each rows as r (r.id)}
					<EntryRow entry={r} kind="earning" showDate {titles} onchanged={load} />
				{:else}
					<p class="p-6 text-center text-sm text-muted">{loaded ? 'Nothing here yet.' : 'Loading…'}</p>
				{/each}
			</div>
		{:else if tab === 'calendar'}
			<CalendarGrid {month} totals={totalsByDay} {selected} onselect={(d) => (selected = d)} onswipe={(d) => (month = addMonths(month, d))} />
			{#if selected}
				<div class="card divide-y divide-line">
					<p class="px-4 py-2 text-sm font-semibold">{dayLabel(selected)}</p>
					{#each dayRows as r (r.id)}
						<EntryRow entry={r} kind="earning" {titles} onchanged={load} />
					{:else}
						<p class="p-4 text-center text-sm text-muted">Nothing on this day.</p>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="card space-y-1 p-4">
				<div class="flex justify-between"><span class="text-muted">Earnings</span><span class="tabular-nums">{money(current?.earnings ?? 0, cur)}</span></div>
				<div class="flex justify-between"><span class="text-muted">Expenses</span><span class="tabular-nums">− {money(current?.expenses ?? 0, cur)}</span></div>
				<div class="flex justify-between border-t border-line pt-2 text-lg font-black">
					<span>Net</span>
					<span class="tabular-nums {(current?.net ?? 0) < 0 ? 'text-danger' : 'text-accent'}" data-testid="net-total">{money(current?.net ?? 0, cur)}</span>
				</div>
			</div>
			<ul class="card divide-y divide-line">
				{#each net as n (n.month)}
					<li>
						<button class="block w-full px-4 py-2.5 text-left {n.month === month ? 'bg-surface2' : ''}" onclick={() => (month = n.month)}>
							<div class="flex justify-between text-sm">
								<span class="font-semibold">{monthLabel(n.month).split(' ')[0]}</span>
								<span class="tabular-nums {n.net < 0 ? 'text-danger' : ''}">{money(n.net, cur)}</span>
							</div>
							<div class="mt-1.5 space-y-1">
								<div class="h-1.5 rounded-full bg-accent" style="width:{(n.earnings / netMax) * 100}%"></div>
								<div class="h-1.5 rounded-full bg-danger" style="width:{(n.expenses / netMax) * 100}%"></div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
			<p class="text-center text-xs text-muted"><span class="text-accent">▬</span> earnings · <span class="text-danger">▬</span> expenses</p>
		{/if}
	</div>

	<button
		class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 grid h-14 w-14 place-items-center rounded-full bg-amber-500 text-3xl font-bold text-black shadow-lg"
		aria-label="Add"
		onclick={add}>+</button
	>
</div>
