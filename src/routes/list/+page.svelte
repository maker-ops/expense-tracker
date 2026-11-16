<script lang="ts">
	import EntryRow from '#lib/components/EntryRow.svelte';
	import { dayLabel, money } from '#lib/format.ts';

	let { data } = $props();
	let formEl: HTMLFormElement;
	let timer: ReturnType<typeof setTimeout>;

	const submit = () => formEl.requestSubmit();
	const typing = () => {
		clearTimeout(timer);
		timer = setTimeout(submit, 350);
	};

	const groupedByDay = $derived.by(() => {
		const out: { date: string; rows: any[]; total: number }[] = [];
		for (const r of data.rows) {
			let g = out[out.length - 1];
			if (!g || g.date !== r.date) out.push((g = { date: r.date, rows: [], total: 0 }));
			g.rows.push(r);
			g.total += r.amountCents;
		}
		return out;
	});
	const hasFilters = $derived(Object.values(data.f).some(Boolean));
	const moreHref = $derived.by(() => {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries(data.f)) if (v) q.set(k, String(v));
		q.set('limit', String(data.limit + 50));
		return `/list?${q}`;
	});
</script>

<svelte:head><title>List</title></svelte:head>

<div class="space-y-4">
	<form method="GET" bind:this={formEl} class="space-y-2" data-sveltekit-keepfocus data-sveltekit-noscroll>
		<input name="q" type="search" value={data.f.q} placeholder="Search title or note…" class="w-full" oninput={typing} aria-label="Search" />
		<div class="grid grid-cols-3 gap-2">
			<select name="person" class="w-full" aria-label="Person" onchange={submit}>
				<option value="">Person</option>
				{#each data.people as p}<option value={p.id} selected={data.f.person === p.id}>{p.name}</option>{/each}
			</select>
			<select name="group" class="w-full" aria-label="Group" onchange={submit}>
				<option value="">Group</option>
				{#each data.groups as g}<option value={g.id} selected={data.f.group === g.id}>{g.icon} {g.name}</option>{/each}
			</select>
			<select name="category" class="w-full" aria-label="Category" onchange={submit}>
				<option value="">Category</option>
				{#each data.categories as c}<option value={c.id} selected={data.f.category === c.id}>{c.icon} {c.name}</option>{/each}
			</select>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<label class="text-xs text-muted">From <input name="from" type="date" value={data.f.from} class="mt-1 w-full" onchange={submit} /></label>
			<label class="text-xs text-muted">To <input name="to" type="date" value={data.f.to} class="mt-1 w-full" onchange={submit} /></label>
		</div>
		<noscript><button class="btn">Apply</button></noscript>
	</form>

	<div class="flex items-center justify-between text-sm">
		<span class="text-muted" data-testid="count">{data.count} expense{data.count === 1 ? '' : 's'}{hasFilters ? ' (filtered)' : ''}</span>
		<span class="font-bold tabular-nums">{money(data.total, data.currency)}</span>
		{#if hasFilters}<a href="/list" class="text-accent underline">Clear</a>{/if}
	</div>

	{#each groupedByDay as g (g.date)}
		<section class="card divide-y divide-line">
			<div class="flex items-baseline justify-between px-4 py-2 text-sm">
				<h2 class="font-bold">{dayLabel(g.date)}</h2>
				<span class="tabular-nums text-muted">{money(g.total, data.currency)}</span>
			</div>
			{#each g.rows as r (r.id)}<EntryRow entry={r} showDate />{/each}
		</section>
	{:else}
		<p class="card p-8 text-center text-sm text-muted">No expenses found.</p>
	{/each}

	{#if data.rows.length < data.count}
		<a href={moreHref} class="btn w-full" data-sveltekit-noscroll>Load more ({data.count - data.rows.length} left)</a>
	{/if}
</div>
