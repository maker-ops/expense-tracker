<script lang="ts">
	import { daysInMonth, firstWeekday, todayStr } from '#lib/format.ts';

	let {
		month,
		totals,
		selected = null,
		onselect,
		onswipe
	}: {
		month: string;
		totals: Record<string, number>;
		selected?: string | null;
		onselect: (date: string) => void;
		onswipe?: (dir: -1 | 1) => void;
	} = $props();

	const days = $derived(daysInMonth(month));
	const offset = $derived(firstWeekday(month));
	const max = $derived(Math.max(0, ...Object.values(totals)));
	const today = todayStr();

	const compact = (c: number) => {
		const v = c / 100;
		return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2);
	};

	let sx = 0;
	let sy = 0;
	function down(e: TouchEvent) {
		sx = e.changedTouches[0].clientX;
		sy = e.changedTouches[0].clientY;
	}
	function up(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - sx;
		const dy = e.changedTouches[0].clientY - sy;
		if (Math.abs(dx) > 60 && Math.abs(dy) < 45) onswipe?.(dx < 0 ? 1 : -1);
	}
</script>

<div role="presentation" ontouchstart={down} ontouchend={up}>
	<div class="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold text-muted">
		{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as d}<span>{d}</span>{/each}
	</div>
	<div class="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
		{#each Array(offset) as _}<span></span>{/each}
		{#each Array(days) as _, i}
			{@const day = i + 1}
			{@const date = `${month}-${String(day).padStart(2, '0')}`}
			{@const total = totals[date] ?? 0}
			{@const ratio = max ? total / max : 0}
			<button
				class="relative flex aspect-square flex-col items-center justify-between rounded-lg border px-0.5 py-1 text-center {selected === date ? 'border-accent ring-2 ring-accent' : date === today ? 'border-accent/70' : 'border-line'}"
				style="background: {total ? `rgb(var(--accent-rgb) / ${(0.14 + ratio * 0.62).toFixed(2)})` : 'var(--surface)'}"
				aria-label="{date}: {total ? (total / 100).toFixed(2) : 'nothing'}"
				data-day={date}
				data-total={total}
				onclick={() => onselect(date)}
			>
				<span class="text-[11px] font-semibold leading-none {date === today ? 'text-accent' : 'text-muted'}">{day}</span>
				<span class="text-[10px] font-bold leading-none tabular-nums">{total ? compact(total) : ''}</span>
			</button>
		{/each}
	</div>
</div>
