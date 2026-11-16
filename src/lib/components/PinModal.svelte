<script lang="ts">
	import { api, ApiError, setEarningsToken } from '#lib/api.ts';
	import { ui } from '#lib/state.svelte.ts';

	let pin = $state('');
	let error = $state('');
	let busy = $state(false);
	let input: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (ui.pinOpen) {
			pin = '';
			error = '';
			// the modal is rendered by {#if}; focus once it exists
			queueMicrotask(() => input?.focus());
		}
	});

	async function submit(e: Event) {
		e.preventDefault();
		if (busy || pin.length < 4) return;
		busy = true;
		error = '';
		try {
			const r = await api<{ token: string; expiresAt: number }>('POST', '/api/earnings/unlock', { pin });
			setEarningsToken(r);
			ui.pinOpen = false;
			ui.vaultOpen = true;
		} catch (err) {
			error = err instanceof ApiError && err.status === 429 ? 'Too many attempts. Try later.' : 'Wrong PIN';
			pin = '';
		} finally {
			busy = false;
		}
	}
</script>

{#if ui.pinOpen}
	<div class="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-6" role="dialog" aria-modal="true" aria-label="PIN">
		<form class="card rise w-full max-w-xs space-y-4 p-5" onsubmit={submit}>
			<label for="pin" class="block text-center text-sm font-semibold">Enter PIN</label>
			<input
				id="pin"
				bind:this={input}
				bind:value={pin}
				type="password"
				inputmode="numeric"
				pattern="[0-9]*"
				maxlength="6"
				autocomplete="off"
				class="w-full text-center text-2xl tracking-[0.5em]"
				oninput={() => (pin = pin.replace(/\D/g, ''))}
			/>
			{#if error}<p class="text-center text-sm text-danger" role="alert">{error}</p>{/if}
			<div class="flex gap-2">
				<button type="button" class="btn flex-1" onclick={() => (ui.pinOpen = false)}>Cancel</button>
				<button class="btn btn-primary flex-1" disabled={busy || pin.length < 4}>Unlock</button>
			</div>
		</form>
	</div>
{/if}
