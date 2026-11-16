import { and, desc, eq, gte, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { getDb, getSetting, getSqlite } from './db';
import { categories, earnings, expenses, groups, people } from './schema';

export type Kind = 'expense' | 'earning';
const tbl = (k: Kind) => (k === 'expense' ? expenses : earnings);

export function currency() {
	return getSetting('currency', 'EUR');
}

export function lookups() {
	const db = getDb();
	return {
		people: db.select().from(people).orderBy(people.name).all(),
		groups: db.select().from(groups).orderBy(groups.name).all(),
		categories: db.select().from(categories).orderBy(categories.name).all()
	};
}

/* ------------------------------------------------------------------ validation */

const isDate = (s: unknown): s is string => {
	if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const d = new Date(s + 'T00:00:00Z');
	return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const optId = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

export type Entry = {
	title: string;
	amountCents: number;
	currency: string;
	date: string;
	personId: number | null;
	groupId: number | null;
	categoryId: number | null;
	note: string;
};

export function validateEntry(body: any, kind: Kind): { value: Entry } | { error: string } {
	if (!body || typeof body !== 'object') return { error: 'Invalid body' };
	const title = String(body.title ?? '').trim().slice(0, 120);
	if (!title) return { error: 'Title is required' };
	const amountCents = Number(body.amountCents);
	if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 1e11)
		return { error: 'Amount must be a positive number' };
	if (!isDate(body.date)) return { error: 'Invalid date' };
	const personId = optId(body.personId);
	const groupId = optId(body.groupId);
	const categoryId = kind === 'expense' ? optId(body.categoryId) : null;
	for (const id of [personId, groupId, categoryId])
		if (id !== null && !Number.isInteger(id)) return { error: 'Invalid reference' };
	const cur = typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency) ? body.currency : currency();
	return {
		value: {
			title,
			amountCents,
			currency: cur,
			date: body.date,
			personId,
			groupId,
			categoryId,
			note: String(body.note ?? '').slice(0, 500)
		}
	};
}

/* ------------------------------------------------------------------ CRUD */

export function insertEntry(kind: Kind, v: Entry) {
	const t: any = tbl(kind);
	const values: any = { ...v, createdAt: new Date().toISOString() };
	if (kind === 'earning') delete values.categoryId;
	return getDb().insert(t).values(values).returning().get() as any;
}

export function updateEntry(kind: Kind, id: number, v: Entry) {
	const t: any = tbl(kind);
	const values: any = { ...v };
	if (kind === 'earning') delete values.categoryId;
	return getDb()
		.update(t)
		.set(values)
		.where(and(eq(t.id, id), isNull(t.deletedAt)))
		.returning()
		.get() as any;
}

export function softDelete(kind: Kind, id: number) {
	const t: any = tbl(kind);
	return getDb()
		.update(t)
		.set({ deletedAt: new Date().toISOString() })
		.where(and(eq(t.id, id), isNull(t.deletedAt)))
		.returning()
		.get();
}

export function restoreEntry(kind: Kind, id: number) {
	const t: any = tbl(kind);
	return getDb().update(t).set({ deletedAt: null }).where(eq(t.id, id)).returning().get();
}

/* ------------------------------------------------------------------ reads */

export type ListFilters = {
	q?: string;
	personId?: number;
	groupId?: number;
	categoryId?: number;
	from?: string;
	to?: string;
	limit?: number;
	offset?: number;
};

export function listExpenses(f: ListFilters) {
	const conds: (SQL | undefined)[] = [isNull(expenses.deletedAt)];
	if (f.q) {
		const pat = `%${f.q.replace(/[\\%_]/g, '\\$&')}%`;
		conds.push(or(sql`${expenses.title} LIKE ${pat} ESCAPE '\\'`, sql`${expenses.note} LIKE ${pat} ESCAPE '\\'`));
	}
	if (f.personId) conds.push(eq(expenses.personId, f.personId));
	if (f.groupId) conds.push(eq(expenses.groupId, f.groupId));
	if (f.categoryId) conds.push(eq(expenses.categoryId, f.categoryId));
	if (f.from) conds.push(gte(expenses.date, f.from));
	if (f.to) conds.push(lte(expenses.date, f.to));
	const where = and(...conds);
	const db = getDb();
	const rows = db
		.select()
		.from(expenses)
		.where(where)
		.orderBy(desc(expenses.date), desc(expenses.id))
		.limit(f.limit ?? 50)
		.offset(f.offset ?? 0)
		.all();
	const agg = db
		.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${expenses.amountCents}),0)` })
		.from(expenses)
		.where(where)
		.get()!;
	return { rows, count: agg.n, total: agg.total };
}

export const monthRange = (month: string) => ({ from: `${month}-01`, to: `${month}-31` });

export function monthEntries(kind: Kind, month: string, personId?: number, groupId?: number) {
	const t: any = tbl(kind);
	const { from, to } = monthRange(month);
	const conds = [isNull(t.deletedAt), gte(t.date, from), lte(t.date, to)];
	if (personId) conds.push(eq(t.personId, personId));
	if (groupId) conds.push(eq(t.groupId, groupId));
	return getDb()
		.select()
		.from(t)
		.where(and(...conds))
		.orderBy(desc(t.date), desc(t.id))
		.all() as any[];
}

/** Distinct titles (case-insensitive) with the most recent row's attributes and usage count. */
export function titleSuggestions(kind: Kind) {
	const t = kind === 'expense' ? 'expenses' : 'earnings';
	const cat = kind === 'expense' ? 'e.category_id' : 'NULL';
	return getSqlite()
		.prepare(
			`SELECT e.title AS title, e.amount_cents AS amountCents, ${cat} AS categoryId,
			        e.group_id AS groupId, e.person_id AS personId, c.cnt AS count
			 FROM ${t} e
			 JOIN (SELECT MAX(id) AS mid, COUNT(*) AS cnt FROM ${t}
			       WHERE deleted_at IS NULL GROUP BY lower(title)) c ON c.mid = e.id
			 ORDER BY c.cnt DESC, e.id DESC LIMIT 300`
		)
		.all() as {
		title: string;
		amountCents: number;
		categoryId: number | null;
		groupId: number | null;
		personId: number | null;
		count: number;
	}[];
}

export function statsForMonth(month: string) {
	const { from, to } = monthRange(month);
	const sq = getSqlite();
	const by = (col: string, tableName: string) =>
		sq
			.prepare(
				`SELECT x.id AS id, COALESCE(x.name, 'None') AS name, COALESCE(SUM(e.amount_cents),0) AS total, COUNT(e.id) AS count
				 FROM expenses e LEFT JOIN ${tableName} x ON x.id = e.${col}
				 WHERE e.deleted_at IS NULL AND e.date BETWEEN ? AND ?
				 GROUP BY x.id ORDER BY total DESC`
			)
			.all(from, to) as { id: number | null; name: string; total: number; count: number }[];
	const total = (
		sq
			.prepare('SELECT COALESCE(SUM(amount_cents),0) AS t FROM expenses WHERE deleted_at IS NULL AND date BETWEEN ? AND ?')
			.get(from, to) as { t: number }
	).t;
	return {
		total,
		byPerson: by('person_id', 'people'),
		byGroup: by('group_id', 'groups'),
		byCategory: by('category_id', 'categories')
	};
}

export function netForYear(year: string) {
	const sq = getSqlite();
	const sums = (t: string) =>
		new Map(
			(
				sq
					.prepare(
						`SELECT substr(date,1,7) AS m, SUM(amount_cents) AS s FROM ${t}
						 WHERE deleted_at IS NULL AND substr(date,1,4) = ? GROUP BY m`
					)
					.all(year) as { m: string; s: number }[]
			).map((r) => [r.m, r.s])
		);
	const ex = sums('expenses');
	const ea = sums('earnings');
	return Array.from({ length: 12 }, (_, i) => {
		const m = `${year}-${String(i + 1).padStart(2, '0')}`;
		const earn = ea.get(m) ?? 0;
		const spent = ex.get(m) ?? 0;
		return { month: m, earnings: earn, expenses: spent, net: earn - spent };
	});
}
