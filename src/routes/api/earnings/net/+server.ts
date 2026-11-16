import { json } from '@sveltejs/kit';
import { netForYear } from '#lib/server/queries.ts';

export function GET({ url }) {
	const year = url.searchParams.get('year') ?? '';
	if (!/^\d{4}$/.test(year)) return json({ error: 'Invalid year' }, { status: 400 });
	return json({ months: netForYear(year) });
}
