import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb, getSqlite } from '#lib/server/db.ts';
import { categories, groups, people } from '#lib/server/schema.ts';

const err = (error: string, status = 400) => json({ error }, { status });
const COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH({ params, request }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) return err('Bad id');
	let b: any;
	try {
		b = await request.json();
	} catch {
		return err('Invalid body');
	}
	const set: Record<string, unknown> = {};
	if (typeof b.name === 'string') {
		const name = b.name.trim().slice(0, 60);
		if (!name) return err('Name is required');
		set.name = name;
	}
	if (COLOR.test(b.color) && params.type !== 'categories') set.color = b.color;
	if (typeof b.icon === 'string' && b.icon.trim() && params.type !== 'people') set.icon = b.icon.trim().slice(0, 8);
	if (typeof b.archived === 'boolean' && params.type !== 'categories') set.archived = b.archived;
	if (!Object.keys(set).length) return err('Nothing to update');
	const db = getDb();
	const tables: Record<string, unknown> = { people, groups, categories };
	const t = Object.hasOwn(tables, params.type) ? (tables[params.type] as any) : null;
	if (!t) return err('Unknown type', 404);
	const row = db.update(t).set(set).where(eq(t.id, id)).returning().get();
	return row ? json(row) : err('Not found', 404);
}

/** Categories can be deleted (expenses become uncategorised). People/groups are archived instead when in use. */
export function DELETE({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) return err('Bad id');
	const sq = getSqlite();
	const cols: Record<string, string> = { people: 'person_id', groups: 'group_id', categories: 'category_id' };
	if (!Object.hasOwn(cols, params.type)) return err('Unknown type', 404);
	const col = cols[params.type];
	if (params.type === 'categories') {
		sq.prepare('UPDATE expenses SET category_id = NULL WHERE category_id = ?').run(id);
	} else {
		const used =
			(sq.prepare(`SELECT COUNT(*) n FROM expenses WHERE ${col} = ?`).get(id) as { n: number }).n +
			(sq.prepare(`SELECT COUNT(*) n FROM earnings WHERE ${col} = ?`).get(id) as { n: number }).n;
		if (used) return err('In use: archive it instead', 409);
	}
	sq.prepare(`DELETE FROM ${params.type} WHERE id = ?`).run(id);
	return json({ ok: true });
}
