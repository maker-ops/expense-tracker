<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { api, ApiError } from '#lib/api.ts';
	import { centsToInput, fmtDate, money, todayStr, toCents } from '#lib/format.ts';
	import { formCtl, toast, type FormOpts, type TitleSuggestion } from '#lib/state.svelte.ts';
	import { flushSync, onMount } from 'svelte';

	// Always mounted (just hidden) so openForm() can focus the amount field inside the tap handler.
	let kind = $state<'expense' | 'earning'>('expense');
	let mode = $state<'add' | 'edit' | 'repeat'>('add');
	let editId = $state<number | null>(null);
	let customTitles = $state<TitleSuggestion[] | null>(null);
	let onsaved: (() => void) | undefined;

	let amount = $state('');
	let title = $state('');
	let personId = $state<number | null>(null);
	let groupId = $state<number | null>(null);
	let categoryId = $state<number | null>(null);
	let date = $state(todayStr());
	let note = $state('');
	let currency = $state('EUR');
	let busy = $state(false);
	let error = $state('');
	let titleFocused = $state(false);
	let showNote = $state(false);

	let amountEl: HTMLInputElement | undefined = $state();

	const people = $derived<any[]>(page.data.people ?? []);
	const groups = $derived<any[]>(page.data.groups ?? []);
	const categories = $derived<any[]>(page.data.categories ?? []);
	const titles = $derived<TitleSuggestion[]>(customTitles ?? page.data.titles ?? []);
	const frequent = $derived(titles.slice(0, 8));

	const matches = $derived.by(() => {
		const q = title.trim().toLowerCase();
		if (!q || !titleFocused) return [];
		return titles.filter((t) => t.title.toLowerCase().includes(q) && t.title.toLowerCase() !== q).slice(0, 5);
	});

	const visible = (list: any[], selected: number | null) => list.filter((x) => !x.archived || x.id === selected);

	function lastUsed(key: string, list: any[]): number | null {
		try {
			const v = Number(localStorage.getItem(key));
			return list.some((x) => x.id === v && !x.archived) ? v : null;
		} catch {
			return null;
		}
	}

	function load(o: FormOpts) {
		kind = o.kind;
		mode = o.mode;
		customTitles = o.titles ?? null;
		onsaved = o.onsaved;
		error = '';
		busy = false;
		titleFocused = false;
		currency = o.entry?.currency ?? page.data.currency ?? 'EUR';
		if (o.entry) {
			editId = o.mode === 'edit' ? o.entry.id : null;
			title = o.entry.title;
			amount = centsToInput(o.entry.amountCents);
			personId = o.entry.personId;
			groupId = o.entry.groupId;
			categoryId = o.entry.categoryId ?? null;
			note = o.entry.note ?? '';
			date = o.mode === 'edit' ? o.entry.date : todayStr();
			currency = page.data.currency ?? currency;
		} else {
			editId = null;
			title = '';
			amount = '';
			note = '';
			categoryId = null;
			date = todayStr();
			personId = lastUsed('lastPerson', people);
			groupId = lastUsed('lastGroup', groups);
		}
		showNote = !!note;
	}

	function focus() {
		amountEl?.focus();
		if (amount) amountEl?.select();
	}

	onMount(() => {
		formCtl.api = { load, focus };
		return () => (formCtl.api = null);
	});

	function close() {
		formCtl.open = false;
		(document.activeElement as HTMLElement | null)?.blur?.();
	}

	/** Quick re-add: pre-fill everything from a previous title, keep the price editable. */
	function pick(t: TitleSuggestion) {
		title = t.title;
		amount = centsToInput(t.amountCents);
		if (kind === 'expense') categoryId = t.categoryId;
		if (t.groupId !== null) groupId = t.groupId;
		if (t.personId !== null) personId = t.personId;
		titleFocused = false;
		flushSync(); // value must be in the DOM before select() so typing replaces it
		focus();
	}

	async function save(e?: Event) {
		e?.preventDefault();
		if (busy) return;
		const cents = toCents(amount);
		if (!cents || cents <= 0) {
			error = 'Enter an amount';
			amountEl?.focus();
			return;
		}
		if (!title.trim()) {
			error = 'Enter a title';
			return;
		}
		busy = true;
		error = '';
		const payload = {
			title: title.trim(),
			amountCents: cents,
			currency,
			date,
			personId,
			groupId,
			categoryId: kind === 'expense' ? categoryId : null,
			note
		};
		const base = kind === 'expense' ? '/api/expenses' : '/api/earnings';
		try {
			if (editId) await api('PATCH', `${base}/${editId}`, payload);
			else await api('POST', base, payload);
			try {
				if (personId) localStorage.setItem('lastPerson', String(personId));
				if (groupId) localStorage.setItem('lastGroup', String(groupId));
			} catch {
				/* private mode */
			}
			close();
			toast(editId ? 'Saved' : `Added ${money(cents, currency)}`);
			await invalidateAll();
			onsaved?.();
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Could not save';
		} finally {
			busy = false;
		}
	}

	function toggle(current: number | null, id: number) {
		return current === id ? null : id;
	}
</script>

<svelte:window onkeydown={(e) => formCtl.open && e.key === 'Escape' && close()} />

<div class="fixed inset-0 z-[75] {formCtl.open ? '' : 'hidden'}" role="dialog" aria-modal="true" aria-label="Expense form">
	<button class="absolute inset-0 bg-black/60" aria-label="Close" tabindex="-1" onclick={close}></button>
	<form
		class="rise absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
		onsubmit={save}
	>
		<div class="flex items-center justify-between px-5 pb-1 pt-4">
			<h2 class="text-base font-bold">
				{mode === 'edit' ? 'Edit' : mode === 'repeat' ? 'Repeat' : 'New'} {kind === 'expense' ? 'expense' : 'entry'}
			</h2>
			<button type="button" class="px-2 text-2xl leading-none text-muted" aria-label="Close" onclick={close}>×</button>
		</div>

		<div class="space-y-4 overflow-y-auto px-5 pb-4 pt-2">
			{#if mode === 'add' && frequent.length}
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Recent / frequent</p>
					<div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
						{#each frequent as t (t.title)}
							<button type="button" class="chip" onclick={() => pick(t)}>{t.title}</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<input
					bind:this={amountEl}
					bind:value={amount}
					inputmode="decimal"
					enterkeyhint="next"
					autocomplete="off"
					placeholder="0.00"
					aria-label="Amount"
					class="w-full text-4xl font-bold"
				/>
				<span class="text-lg font-semibold text-muted">{currency}</span>
			</div>

			<div class="relative">
				<input
					bind:value={title}
					onfocus={() => (titleFocused = true)}
					onblur={() => setTimeout(() => (titleFocused = false), 150)}
					placeholder="Title (e.g. Coffee)"
					aria-label="Title"
					autocomplete="off"
					autocapitalize="sentences"
					maxlength="120"
					class="w-full"
				/>
				{#if matches.length}
					<ul class="card absolute inset-x-0 z-10 mt-1 overflow-hidden shadow-xl">
						{#each matches as t (t.title)}
							<li>
								<button
									type="button"
									class="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-surface2"
									onpointerdown={(e) => {
										e.preventDefault();
										pick(t);
									}}
								>
									<span class="truncate">{t.title}</span>
									<span class="ml-3 shrink-0 text-sm text-muted">{money(t.amountCents, currency)}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div>
				<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Person</p>
				<div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
					{#each visible(people, personId) as p (p.id)}
						<button type="button" class="chip" aria-pressed={personId === p.id} onclick={() => (personId = toggle(personId, p.id))}>
							<span class="h-2.5 w-2.5 rounded-full" style="background:{p.color}"></span>{p.name}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Group</p>
				<div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
					{#each visible(groups, groupId) as g (g.id)}
						<button type="button" class="chip" aria-pressed={groupId === g.id} onclick={() => (groupId = toggle(groupId, g.id))}>
							<span>{g.icon}</span>{g.name}
						</button>
					{/each}
				</div>
			</div>

			{#if kind === 'expense'}
				<div>
					<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Category</p>
					<div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
						{#each categories as c (c.id)}
							<button type="button" class="chip" aria-pressed={categoryId === c.id} onclick={() => (categoryId = toggle(categoryId, c.id))}>
								<span>{c.icon}</span>{c.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<label class="relative flex-1">
					<span class="sr-only">Date</span>
					<span class="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-2.5">
						<span>📅 {fmtDate(date)}</span>
						<span class="text-xs text-muted">{date === todayStr() ? 'Today' : ''}</span>
					</span>
					<input type="date" bind:value={date} class="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Date" />
				</label>
				{#if !showNote}
					<button type="button" class="btn px-3" onclick={() => (showNote = true)}>+ Note</button>
				{/if}
			</div>
			{#if showNote}
				<input bind:value={note} placeholder="Note (optional)" aria-label="Note" maxlength="500" class="w-full" />
			{/if}

			{#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
		</div>

		<div class="border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
			<button class="btn btn-primary w-full py-3.5 text-base" disabled={busy}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Save'}</button>
		</div>
	</form>
</div>
