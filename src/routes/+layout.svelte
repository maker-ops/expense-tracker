<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import ExpenseForm from '#lib/components/ExpenseForm.svelte';
	import Header from '#lib/components/Header.svelte';
	import OfflineBanner from '#lib/components/OfflineBanner.svelte';
	import PinModal from '#lib/components/PinModal.svelte';
	import TabBar from '#lib/components/TabBar.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { ui } from '#lib/state.svelte.ts';

	let { children, data } = $props();

	const titles: Record<string, string> = { '/': 'Calendar', '/list': 'List', '/stats': 'Stats', '/settings': 'Settings' };
	const title = $derived(titles[page.url.pathname] ?? '');

	// The private area is a lazily loaded chunk: its code is not even downloaded until unlocked.
	let vaultLoader = $derived(ui.vaultOpen ? import('#lib/components/Vault.svelte') : null);
</script>

<OfflineBanner />

{#if data.authed}
	<Header {title} />
	<main class="mx-auto min-h-[calc(100dvh-8rem)] max-w-2xl px-4 pb-32 pt-4">
		{@render children()}
	</main>
	<TabBar />
	<ExpenseForm />
	<PinModal />
	{#if vaultLoader}
		{#await vaultLoader then m}
			<m.default />
		{/await}
	{/if}
{:else}
	{@render children()}
{/if}

<Toasts />
