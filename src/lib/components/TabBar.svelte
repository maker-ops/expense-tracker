<script lang="ts">
	import { page } from '$app/state';
	import { openForm } from '#lib/state.svelte.ts';

	const tabs = [
		{ href: '/', label: 'Calendar', icon: 'M7 2v3M17 2v3M3.5 8h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z' },
		null,
		{ href: '/list', label: 'List', icon: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
		{ href: '/stats', label: 'Stats', icon: 'M5 20V10M12 20V4M19 20v-7' },
		{ href: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z' }
	];

	const active = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
	aria-label="Main"
>
	<ul class="mx-auto flex max-w-2xl items-end justify-around px-2">
		{#each tabs as t}
			{#if t}
				<li class="flex-1">
					<a
						href={t.href}
						class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium {active(t.href) ? 'text-accent' : 'text-muted'}"
						aria-current={active(t.href) ? 'page' : undefined}
					>
						<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
						{t.label}
					</a>
				</li>
			{:else}
				<li class="flex-1 text-center">
					<button
						class="-mt-5 inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg shadow-black/30 active:scale-95"
						aria-label="Add expense"
						onclick={() => openForm({ kind: 'expense', mode: 'add' })}
					>
						<svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
					</button>
				</li>
			{/if}
		{/each}
	</ul>
</nav>
