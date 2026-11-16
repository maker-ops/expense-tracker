// NOTE: no $app / $env imports here so scripts (seed) can load this module.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;
let _sqlite: Database.Database | null = null;
let _db: Db | null = null;

export function dbPath() {
	return resolve(process.env.DATABASE_PATH || './data/app.db');
}

/** Lazily opens the database (never at import time, so `vite build` does not touch it). */
export function getDb(): Db {
	if (!_db) {
		const path = dbPath();
		mkdirSync(dirname(path), { recursive: true });
		_sqlite = new Database(path);
		_sqlite.pragma('journal_mode = WAL');
		_sqlite.pragma('foreign_keys = ON');
		_sqlite.pragma('busy_timeout = 5000');
		_db = drizzle(_sqlite, { schema });
	}
	return _db;
}

export function getSqlite(): Database.Database {
	getDb();
	return _sqlite!;
}

const DEFAULT_CATEGORIES: [string, string][] = [
	['Food', '🍔'],
	['Groceries', '🛒'],
	['Fuel', '⛽'],
	['Bills', '🧾'],
	['Shopping', '🛍️'],
	['Transport', '🚌'],
	['Health', '💊'],
	['Fun', '🎬'],
	['Home', '🏠'],
	['Other', '🏷️']
];

/** Run migrations, insert default data, purge old soft-deleted rows. */
export function initDb() {
	const db = getDb();
	migrate(db, { migrationsFolder: resolve(process.env.MIGRATIONS_DIR || './drizzle') });
	const sqlite = getSqlite();
	const n = (sqlite.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number }).n;
	if (n === 0) {
		const ins = sqlite.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
		for (const [name, icon] of DEFAULT_CATEGORIES) ins.run(name, icon);
	}
	const cutoff = new Date(Date.now() - 7 * 864e5).toISOString();
	sqlite.prepare('DELETE FROM expenses WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff);
	sqlite.prepare('DELETE FROM earnings WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff);
}

export function getSetting(key: string, fallback: string): string {
	const row = getSqlite().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
	getSqlite()
		.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
		.run(key, value);
}
