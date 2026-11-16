import { json } from '@sveltejs/kit';
import { entryHandlers } from '#lib/server/entryApi.ts';
import { listExpenses } from '#lib/server/queries.ts';

const h = entryHandlers('expense');
export const POST = h.create;

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export function GET({ url }) {
	const p = url.searchParams;
	return json(
		listExpenses({
			q: p.get('q')?.trim() || undefined,
			personId: num(p.get('person')),
			groupId: num(p.get('group')),
			categoryId: num(p.get('category')),
			from: date(p.get('from')),
			to: date(p.get('to')),
			limit: Math.min(num(p.get('limit')) ?? 50, 500),
			offset: num(p.get('offset')) ?? 0
		})
	);
}
