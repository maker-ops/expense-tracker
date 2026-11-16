import { json } from '@sveltejs/kit';
import { entryHandlers } from '#lib/server/entryApi.ts';
import { monthEntries } from '#lib/server/queries.ts';
import { validMonth } from '#lib/format.ts';

// Guarded in hooks.server.ts: needs the session AND a valid earnings-unlock token.
export const POST = entryHandlers('earning').create;

export function GET({ url }) {
	const month = url.searchParams.get('month');
	if (!validMonth(month)) return json({ error: 'Invalid month' }, { status: 400 });
	return json({ rows: monthEntries('earning', month) });
}
