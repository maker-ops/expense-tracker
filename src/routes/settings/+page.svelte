<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, apiRaw, ApiError, clearEarningsToken, download } from '#lib/api.ts';
	import LookupEditor from '#lib/components/LookupEditor.svelte';
	import { CURRENCIES } from '#lib/format.ts';
	import { toast } from '#lib/state.svelte.ts';
	import { onMount } from 'svelte';

	let { data } = $props();
	let dark = $state(true);
	let fileEl: HTMLInputElement;

	onMount(() => (dark = document.documentElement.classList.contains('dark')));

	function setTheme(d: boolean) {
		dark = d;
		document.documentElement.classList.toggle('dark', d);
		document.querySelector('meta[name=theme-color]')?.setAttribute('content', d ? '#0f1115' : '#f6f7f9');
		try {
			localStorage.setItem('theme', d ? 'dark' : 'light');
		} catch {
			/* ignore */
		}
	}

	async function setCurrency(c: string) {
		try {
			await api('PATCH', '/api/settings', { currency: c });
			await invalidateAll();
			toast(`Currency set to ${c}`);
		} catch (e) {
			toast((e as ApiError).message, { error: true });
		}
	}

	async function exportAs(format: 'json' | 'csv') {
		try {
			await download(`/api/export?format=${format}`, `expenses-${new Date().toISOString().slice(0, 10)}.${format}`);
		} catch (e) {
			toast((e as ApiError).message, { error: true });
		}
	}

	async function importFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const r = await apiRaw<{ expenses: number; skipped: number }>('/api/import', await file.text());
			await invalidateAll();
			toast(`Imported ${r.expenses} expenses (${r.skipped} skipped as duplicates/invalid)`, { ms: 5000 });
		} catch (err) {
			toast((err as ApiError).message, { error: true });
		}
		input.value = '';
	}
</script>

<svelte:head><title>Settings</title></svelte:head>

<div class="space-y-4">
	<section class="card space-y-3 p-4">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted">General</h2>
		<label class="flex items-center justify-between gap-3">
			<span>Currency</span>
			<select value={data.currency} onchange={(e) => setCurrency(e.currentTarget.value)} aria-label="Currency">
				{#each CURRENCIES as c}<option>{c}</option>{/each}
			</select>
		</label>
		<div class="flex items-center justify-between gap-3">
			<span>Theme</span>
			<div class="flex gap-2">
				<button class="chip" aria-pressed={dark} onclick={() => setTheme(true)}>🌙 Dark</button>
				<button class="chip" aria-pressed={!dark} onclick={() => setTheme(false)}>☀️ Light</button>
			</div>
		</div>
	</section>

	<LookupEditor type="people" label="People" items={data.people} hasColor />
	<LookupEditor type="groups" label="Groups" items={data.groups} hasColor hasIcon />
	<LookupEditor type="categories" label="Categories" items={data.categories} hasIcon canArchive={false} />

	<section class="card space-y-3 p-4">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted">Your data</h2>
		<div class="grid grid-cols-2 gap-2">
			<button class="btn" onclick={() => exportAs('json')}>Export JSON</button>
			<button class="btn" onclick={() => exportAs('csv')}>Export CSV</button>
		</div>
		<button class="btn w-full" onclick={() => fileEl.click()}>Import from JSON export</button>
		<input bind:this={fileEl} type="file" accept="application/json,.json" class="hidden" onchange={importFile} />
		<p class="text-xs text-muted">Import merges into your data; duplicates are skipped.</p>
	</section>

	<form method="POST" action="/logout" onsubmit={() => clearEarningsToken()}>
		<button class="btn btn-danger w-full">Log out</button>
	</form>
</div>
