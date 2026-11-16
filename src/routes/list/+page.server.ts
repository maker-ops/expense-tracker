import { listExpenses } from '#lib/server/queries.ts';

const id = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export function load({ url }) {
	const p = url.searchParams;
	const limit = Math.min(id(p.get('limit')) ?? 50, 1000);
	const filters = {
		q: p.get('q')?.trim() || undefined,
		personId: id(p.get('person')),
		groupId: id(p.get('group')),
		categoryId: id(p.get('category')),
		from: date(p.get('from')),
		to: date(p.get('to'))
	};
	const res = listExpenses({ ...filters, limit });
	return {
		...res,
		limit,
		f: {
			q: filters.q ?? '',
			person: filters.personId ?? '',
			group: filters.groupId ?? '',
			category: filters.categoryId ?? '',
			from: filters.from ?? '',
			to: filters.to ?? ''
		}
	};
}
