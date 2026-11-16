import { json } from '@sveltejs/kit';
import { setSetting } from '#lib/server/db.ts';

export async function PATCH({ request }) {
	let b: any;
	try {
		b = await request.json();
	} catch {
		return json({ error: 'Invalid body' }, { status: 400 });
	}
	if (typeof b.currency === 'string' && /^[A-Z]{3}$/.test(b.currency)) setSetting('currency', b.currency);
	else return json({ error: 'Invalid currency' }, { status: 400 });
	return json({ ok: true });
}
