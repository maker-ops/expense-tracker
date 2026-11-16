import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.ts';
import { categories, groups, people } from '#lib/server/schema.ts';

const err = (error: string, status = 400) => json({ error }, { status });
const COLOR = /^#[0-9a-fA-F]{6}$/;

export async function POST({ params, request }) {
	let b: any;
	try {
		b = await request.json();
	} catch {
		return err('Invalid body');
	}
	const name = String(b?.name ?? '').trim().slice(0, 60);
	if (!name) return err('Name is required');
	const color = COLOR.test(b?.color) ? b.color : undefined;
	const icon = typeof b?.icon === 'string' && b.icon.trim() ? b.icon.trim().slice(0, 8) : undefined;
	const db = getDb();
	switch (params.type) {
		case 'people':
			return json(db.insert(people).values({ name, ...(color && { color }) }).returning().get(), { status: 201 });
		case 'groups':
			return json(
				db.insert(groups).values({ name, ...(color && { color }), ...(icon && { icon }) }).returning().get(),
				{ status: 201 }
			);
		case 'categories':
			return json(db.insert(categories).values({ name, ...(icon && { icon }) }).returning().get(), { status: 201 });
	}
	return err('Unknown type', 404);
}
