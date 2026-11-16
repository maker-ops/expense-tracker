import { json } from '@sveltejs/kit';
import { earningsUnlocked } from '#lib/server/auth.ts';
import { getDb, getSqlite } from '#lib/server/db.ts';
import { validateEntry } from '#lib/server/queries.ts';
import { categories, earnings, expenses, groups, people } from '#lib/server/schema.ts';

type Named = { id: number; name: string; color?: string; icon?: string };

/** Merge import: people/groups/categories matched by name, entries de-duplicated. */
export async function POST({ request, locals }) {
	let data: any;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Not valid JSON' }, { status: 400 });
	}
	if (!data || data.version !== 1 || !Array.isArray(data.expenses)) {
		return json({ error: 'Not an export from this app' }, { status: 400 });
	}
	const withEarnings =
		Array.isArray(data.earnings) && earningsUnlocked(locals.sid, request.headers.get('x-earnings-token'));
	const db = getDb();
	const sq = getSqlite();
	const result = { expenses: 0, skipped: 0, people: 0, groups: 0, categories: 0, earnings: 0 };

	sq.transaction(() => {
		const mapper = (list: Named[] | undefined, table: any, key: 'people' | 'groups' | 'categories') => {
			const existing = new Map<string, number>(
				(db.select().from(table).all() as Named[]).map((r) => [r.name.toLowerCase(), r.id])
			);
			const map = new Map<number, number>();
			for (const r of list ?? []) {
				if (!r || typeof r.name !== 'string' || !r.name.trim()) continue;
				const k = r.name.trim().toLowerCase();
				let id = existing.get(k);
				if (id === undefined) {
					const vals: any = { name: r.name.trim().slice(0, 60) };
					if (r.color && /^#[0-9a-fA-F]{6}$/.test(r.color)) vals.color = r.color;
					if (typeof r.icon === 'string' && r.icon) vals.icon = r.icon.slice(0, 8);
					id = (db.insert(table).values(vals).returning().get() as Named).id;
					existing.set(k, id);
					result[key]++;
				}
				map.set(r.id, id);
			}
			return map;
		};
		const pm = mapper(data.people, people, 'people');
		const gm = mapper(data.groups, groups, 'groups');
		const cm = mapper(data.categories, categories, 'categories');

		const importRows = (rows: any[], kind: 'expense' | 'earning') => {
			const t: any = kind === 'expense' ? expenses : earnings;
			const tn = kind === 'expense' ? 'expenses' : 'earnings';
			const seen = new Set(
				(
					sq
						.prepare(`SELECT date, lower(title) t, amount_cents a, person_id p, group_id g FROM ${tn} WHERE deleted_at IS NULL`)
						.all() as any[]
				).map((r) => `${r.date}|${r.t}|${r.a}|${r.p}|${r.g}`)
			);
			for (const r of rows) {
				const v = validateEntry(
					{
						...r,
						personId: r.personId != null ? (pm.get(r.personId) ?? null) : null,
						groupId: r.groupId != null ? (gm.get(r.groupId) ?? null) : null,
						categoryId: r.categoryId != null ? (cm.get(r.categoryId) ?? null) : null
					},
					kind
				);
				if ('error' in v) {
					result.skipped++;
					continue;
				}
				const e = v.value;
				const key = `${e.date}|${e.title.toLowerCase()}|${e.amountCents}|${e.personId}|${e.groupId}`;
				if (seen.has(key)) {
					result.skipped++;
					continue;
				}
				seen.add(key);
				const values: any = { ...e, createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString() };
				if (kind === 'earning') delete values.categoryId;
				db.insert(t).values(values).run();
				result[kind === 'expense' ? 'expenses' : 'earnings']++;
			}
		};
		importRows(data.expenses, 'expense');
		if (withEarnings) importRows(data.earnings, 'earning');
	})();

	// earnings count only revealed when the vault is unlocked
	if (!withEarnings) delete (result as any).earnings;
	return json(result);
}
