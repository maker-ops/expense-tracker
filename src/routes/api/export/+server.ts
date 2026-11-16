import { earningsUnlocked } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { currency } from '#lib/server/queries.ts';
import { earnings, expenses, categories, groups, people } from '#lib/server/schema.ts';
import { isNull } from 'drizzle-orm';

const q = (s: unknown) => {
	let v = String(s ?? '');
	if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // spreadsheet formula injection
	return `"${v.replace(/"/g, '""')}"`;
};

export function GET({ url, request, locals }) {
	const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';
	const db = getDb();
	// Earnings are only included when the earnings vault is unlocked; otherwise the key is omitted entirely.
	const withEarnings = earningsUnlocked(locals.sid, request.headers.get('x-earnings-token'));
	const data = {
		version: 1,
		exportedAt: new Date().toISOString(),
		currency: currency(),
		people: db.select().from(people).all(),
		groups: db.select().from(groups).all(),
		categories: db.select().from(categories).all(),
		expenses: db.select().from(expenses).where(isNull(expenses.deletedAt)).all(),
		...(withEarnings ? { earnings: db.select().from(earnings).where(isNull(earnings.deletedAt)).all() } : {})
	};
	const stamp = new Date().toISOString().slice(0, 10);
	if (format === 'json') {
		return new Response(JSON.stringify(data, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="expenses-${stamp}.json"`
			}
		});
	}
	const pn = new Map(data.people.map((p) => [p.id, p.name]));
	const gn = new Map(data.groups.map((g) => [g.id, g.name]));
	const cn = new Map(data.categories.map((c) => [c.id, c.name]));
	const lines = ['type,date,title,amount,currency,person,group,category,note'];
	const row = (type: string, e: any) =>
		[
			type,
			e.date,
			q(e.title),
			(e.amountCents / 100).toFixed(2),
			e.currency,
			q(pn.get(e.personId)),
			q(gn.get(e.groupId)),
			q(cn.get(e.categoryId)),
			q(e.note)
		].join(',');
	for (const e of data.expenses) lines.push(row('expense', e));
	if (withEarnings) for (const e of (data as any).earnings) lines.push(row('earning', e));
	return new Response('﻿' + lines.join('\r\n'), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="expenses-${stamp}.csv"`
		}
	});
}
