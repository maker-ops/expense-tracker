<script lang="ts">
	import { triggerSecret } from '#lib/secret.ts';

	let { title }: { title: string } = $props();

	let timer: ReturnType<typeof setTimeout> | undefined;

	function start(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		clear();
		timer = setTimeout(() => {
			timer = undefined;
			triggerSecret();
		}, 1500);
	}
	function clear() {
		if (timer) clearTimeout(timer);
		timer = undefined;
	}
</script>

<header
	class="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur"
>
	<!-- Press and hold 1.5s for the hidden menu -->
	<div
		class="nohold flex items-center gap-2"
		role="presentation"
		onpointerdown={start}
		onpointerup={clear}
		onpointerleave={clear}
		onpointercancel={clear}
		oncontextmenu={(e) => e.preventDefault()}
	>
		<span class="grid h-8 w-8 place-items-center rounded-lg bg-accent text-lg font-black text-accent-fg">€</span>
		<span class="text-lg font-bold tracking-tight">Expenses</span>
	</div>
	<span class="ml-auto text-sm text-muted">{title}</span>
</header>
