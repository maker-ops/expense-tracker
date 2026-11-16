import { invalidateAll } from '$app/navigation';
import { api, ApiError } from './api';
import { toast, type Entry } from './state.svelte';

/** Soft delete with a 5 second Undo toast. */
export async function deleteEntry(kind: 'expense' | 'earning', entry: Entry, after?: () => void | Promise<void>) {
	const base = kind === 'expense' ? '/api/expenses' : '/api/earnings';
	try {
		await api('DELETE', `${base}/${entry.id}`);
	} catch (e) {
		toast((e as ApiError).message, { error: true });
		return;
	}
	await refresh(after);
	toast(`Deleted "${entry.title}"`, {
		ms: 5000,
		undo: async () => {
			try {
				await api('POST', `${base}/${entry.id}/restore`);
				await refresh(after);
				toast('Restored');
			} catch (e) {
				toast((e as ApiError).message, { error: true });
			}
		}
	});
}

async function refresh(after?: () => void | Promise<void>) {
	await invalidateAll();
	await after?.();
}
