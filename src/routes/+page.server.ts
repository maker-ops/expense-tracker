import { monthEntries } from '#lib/server/queries.ts';
import { thisMonth, validMonth } from '#lib/format.ts';

const id = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export function load({ url }) {
	const p = url.searchParams;
	const m = p.get('month');
	const month = validMonth(m) ? m : thisMonth();
	const person = id(p.get('person'));
	const group = id(p.get('group'));
	const rows = monthEntries('expense', month, person, group);
	return { month, person: person ?? null, group: group ?? null, rows };
}
