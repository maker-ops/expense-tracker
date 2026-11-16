import { statsForMonth } from '#lib/server/queries.ts';
import { thisMonth, validMonth } from '#lib/format.ts';

export function load({ url }) {
	const m = url.searchParams.get('month');
	const month = validMonth(m) ? m : thisMonth();
	return { month, stats: statsForMonth(month) };
}
