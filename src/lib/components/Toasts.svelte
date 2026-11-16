<script lang="ts">
	import { dismissToast, toasts } from '#lib/state.svelte.ts';
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-[calc(5.2rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4"
	aria-live="polite"
>
	{#each toasts as t (t.id)}
		<div
			class="rise pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-xl"
			class:border-danger={t.error}
			role="status"
		>
			<span class="min-w-0 truncate">{t.msg}</span>
			{#if t.undo}
				<button
					class="shrink-0 font-bold text-accent"
					onclick={() => {
						const fn = t.undo;
						dismissToast(t.id);
						fn?.();
					}}>Undo</button
				>
			{/if}
		</div>
	{/each}
</div>
