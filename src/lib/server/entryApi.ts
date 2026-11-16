import { json, type RequestEvent } from '@sveltejs/kit';
import {
	insertEntry,
	restoreEntry,
	softDelete,
	updateEntry,
	validateEntry,
	type Kind
} from './queries';

const err = (error: string, status = 400) => json({ error }, { status });

function id(event: RequestEvent) {
	const n = Number(event.params.id);
	return Number.isInteger(n) && n > 0 ? n : null;
}

async function body(event: RequestEvent) {
	try {
		return await event.request.json();
	} catch {
		return null;
	}
}

/** Shared create / update / soft-delete / restore handlers for expenses and earnings. */
export function entryHandlers(kind: Kind) {
	return {
		async create(event: RequestEvent) {
			const v = validateEntry(await body(event), kind);
			if ('error' in v) return err(v.error);
			try {
				return json(insertEntry(kind, v.value), { status: 201 });
			} catch {
				return err('Unknown person, group or category');
			}
		},
		async update(event: RequestEvent) {
			const n = id(event);
			if (!n) return err('Bad id');
			const v = validateEntry(await body(event), kind);
			if ('error' in v) return err(v.error);
			try {
				const row = updateEntry(kind, n, v.value);
				return row ? json(row) : err('Not found', 404);
			} catch {
				return err('Unknown person, group or category');
			}
		},
		async remove(event: RequestEvent) {
			const n = id(event);
			if (!n) return err('Bad id');
			const row = softDelete(kind, n);
			return row ? json({ ok: true, id: n }) : err('Not found', 404);
		},
		async restore(event: RequestEvent) {
			const n = id(event);
			if (!n) return err('Bad id');
			const row = restoreEntry(kind, n);
			return row ? json(row) : err('Not found', 404);
		}
	};
}
