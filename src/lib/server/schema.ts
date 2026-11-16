import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const people = sqliteTable('people', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	color: text('color').notNull().default('#6366f1'),
	archived: integer('archived', { mode: 'boolean' }).notNull().default(false)
});

export const groups = sqliteTable('groups', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	icon: text('icon').notNull().default('📁'),
	color: text('color').notNull().default('#14b8a6'),
	archived: integer('archived', { mode: 'boolean' }).notNull().default(false)
});

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	icon: text('icon').notNull().default('🏷️')
});

export const expenses = sqliteTable(
	'expenses',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		title: text('title').notNull(),
		amountCents: integer('amount_cents').notNull(),
		currency: text('currency').notNull().default('EUR'),
		date: text('date').notNull(), // YYYY-MM-DD
		personId: integer('person_id').references(() => people.id),
		groupId: integer('group_id').references(() => groups.id),
		categoryId: integer('category_id').references(() => categories.id),
		note: text('note').notNull().default(''),
		createdAt: text('created_at').notNull(),
		deletedAt: text('deleted_at')
	},
	(t) => [index('expenses_date_idx').on(t.date), index('expenses_title_idx').on(t.title)]
);

export const earnings = sqliteTable(
	'earnings',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		title: text('title').notNull(),
		amountCents: integer('amount_cents').notNull(),
		currency: text('currency').notNull().default('EUR'),
		date: text('date').notNull(),
		personId: integer('person_id').references(() => people.id),
		groupId: integer('group_id').references(() => groups.id),
		note: text('note').notNull().default(''),
		createdAt: text('created_at').notNull(),
		deletedAt: text('deleted_at')
	},
	(t) => [index('earnings_date_idx').on(t.date)]
);

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
