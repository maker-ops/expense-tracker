<script lang="ts">
	import { onMount } from 'svelte';
	import { ui } from '#lib/state.svelte.ts';

	onMount(() => {
		const sync = () => (ui.online = navigator.onLine);
		sync();
		window.addEventListener('online', sync);
		window.addEventListener('offline', sync);
		return () => {
			window.removeEventListener('online', sync);
			window.removeEventListener('offline', sync);
		};
	});
</script>

{#if !ui.online}
	<div
		class="sticky top-0 z-[60] bg-amber-500 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-sm font-semibold text-black"
		role="alert"
	>
		You're offline. Changes can't be saved until you're back online.
	</div>
{/if}
