<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Sign in</title></svelte:head>

<div class="grid min-h-dvh place-items-center px-6">
	<form
		method="POST"
		class="card w-full max-w-sm space-y-4 p-6"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<div class="flex items-center gap-3">
			<span class="grid h-11 w-11 place-items-center rounded-xl bg-accent text-2xl font-black text-accent-fg">€</span>
			<h1 class="text-xl font-bold">Expenses</h1>
		</div>
		<label class="block space-y-1.5">
			<span class="text-sm font-medium text-muted">Password</span>
			<input name="password" type="password" autocomplete="current-password" required class="w-full" />
		</label>
		{#if form?.error}<p class="text-sm text-danger" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
	</form>
</div>
