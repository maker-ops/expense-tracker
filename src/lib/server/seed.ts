// Relative imports only: this file is also run by `tsx scripts/seed.ts`.
import { getSqlite, initDb } from './db';
import { todayStr } from '../format';

const TEMPLATES: [string, number, string, string][] = [
	// title, typical cents, category, group
	['Coffee', 280, 'Food', 'Home'],
	['Lunch', 950, 'Food', 'Business'],
	['Groceries', 4200, 'Groceries', 'Home'],
	['Bakery', 420, 'Food', 'Home'],
	['Fuel', 5800, 'Fuel', 'Car'],
	['Parking', 350, 'Transport', 'Car'],
	['Car wash', 1200, 'Other', 'Car'],
	['Electricity bill', 6400, 'Bills', 'Home'],
	['Internet', 1999, 'Bills', 'Home'],
	['Pharmacy', 1350, 'Health', 'Home'],
	['Cinema', 1400, 'Fun', 'Home'],
	['Taxi', 780, 'Transport', 'Business'],
	['Hotel Athens', 8900, 'Other', 'Trip to Greece'],
	['Gyros', 1100, 'Food', 'Trip to Greece'],
	['Ferry tickets', 5400, 'Transport', 'Trip to Greece']
];

// small deterministic PRNG so demo data is stable
function rng(seed: number) {
	return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function seedDemo() {
	initDb();
	const sq = getSqlite();
	const r = rng(42);
	const ensure = (table: string, name: string, extra: Record<string, string>) => {
		const row = sq.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name) as { id: number } | undefined;
		if (row) return row.id;
		const cols = ['name', ...Object.keys(extra)];
		return Number(
			sq
				.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
				.run(name, ...Object.values(extra)).lastInsertRowid
		);
	};
	const me = ensure('people', 'Me', { color: '#6366f1' });
	const partner = ensure('people', 'Partner', { color: '#ec4899' });
	const groups: Record<string, number> = {
		Home: ensure('groups', 'Home', { icon: '🏠', color: '#14b8a6' }),
		Car: ensure('groups', 'Car', { icon: '🚗', color: '#f59e0b' }),
		'Trip to Greece': ensure('groups', 'Trip to Greece', { icon: '🏝️', color: '#0ea5e9' }),
		Business: ensure('groups', 'Business', { icon: '💼', color: '#8b5cf6' })
	};
	const cats = Object.fromEntries(
		(sq.prepare('SELECT id, name FROM categories').all() as { id: number; name: string }[]).map((c) => [c.name, c.id])
	);

	const insE = sq.prepare(
		`INSERT INTO expenses (title, amount_cents, currency, date, person_id, group_id, category_id, note, created_at)
		 VALUES (?, ?, 'EUR', ?, ?, ?, ?, '', ?)`
	);
	const insEarn = sq.prepare(
		`INSERT INTO earnings (title, amount_cents, currency, date, person_id, group_id, note, created_at)
		 VALUES (?, ?, 'EUR', ?, ?, ?, '', ?)`
	);
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	let count = 0;
	sq.transaction(() => {
		// previous month + current month (up to today)
		for (const back of [1, 0]) {
			const d0 = new Date(now.getFullYear(), now.getMonth() - back, 1);
			const last = back === 0 ? now.getDate() : new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
			for (let day = 1; day <= last; day++) {
				const date = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(day)}`;
				const n = Math.floor(r() * 4); // 0-3 expenses a day
				for (let i = 0; i < n; i++) {
					const [title, cents, cat, grp] = TEMPLATES[Math.floor(r() * TEMPLATES.length)];
					const amount = Math.max(100, Math.round((cents * (0.7 + r() * 0.7)) / 10) * 10);
					insE.run(title, amount, date, r() < 0.65 ? me : partner, groups[grp], cats[cat] ?? null, new Date().toISOString());
					count++;
				}
			}
			const m = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}`;
			insEarn.run('Salary', 220000, `${m}-05`, me, groups.Business, new Date().toISOString());
			insEarn.run('Freelance project', 45000 + Math.round(r() * 30000), `${m}-18`, me, groups.Business, new Date().toISOString());
		}
	})();
	console.log(`[seed] inserted ${count} expenses for ${todayStr()} (+ demo earnings)`);
}
