import { json } from '@sveltejs/kit';
import { getSqlite } from '#lib/server/db.ts';

export function GET() {
	try {
		getSqlite().prepare('SELECT 1').get();
		return json({ ok: true });
	} catch {
		return json({ ok: false }, { status: 503 });
	}
}
