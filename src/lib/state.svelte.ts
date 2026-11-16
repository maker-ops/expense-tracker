import { flushSync } from 'svelte';

/* ---- toasts ------------------------------------------------------------ */
export type Toast = { id: number; msg: string; undo?: () => void | Promise<void>; error?: boolean };
export const toasts = $state<Toast[]>([]);
let tid = 0;

export function toast(msg: string, opts: { undo?: Toast['undo']; ms?: number; error?: boolean } = {}) {
	const t: Toast = { id: ++tid, msg, undo: opts.undo, error: opts.error };
	toasts.push(t);
	setTimeout(() => dismissToast(t.id), opts.ms ?? (opts.undo ? 5000 : 2500));
}
export function dismissToast(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

/* ---- add/edit form ----------------------------------------------------- */
export type TitleSuggestion = {
	title: string;
	amountCents: number;
	categoryId: number | null;
	groupId: number | null;
	personId: number | null;
	count: number;
};
export type Entry = {
	id: number;
	title: string;
	amountCents: number;
	currency: string;
	date: string;
	personId: number | null;
	groupId: number | null;
	categoryId?: number | null;
	note: string;
};
export type FormOpts = {
	kind: 'expense' | 'earning';
	mode: 'add' | 'edit' | 'repeat';
	entry?: Entry;
	titles?: TitleSuggestion[];
	onsaved?: () => void;
};

export const formCtl = $state<{ open: boolean; api: null | { load(o: FormOpts): void; focus(): void } }>({
	open: false,
	api: null
});

/**
 * Opens the (always mounted) form. Everything happens synchronously inside the tap handler so iOS
 * lets focus() raise the numeric keypad.
 */
export function openForm(o: FormOpts) {
	if (!formCtl.api) return;
	formCtl.api.load(o);
	formCtl.open = true;
	flushSync();
	formCtl.api.focus();
}

/* ---- misc ui ------------------------------------------------------------ */
export const ui = $state({ pinOpen: false, vaultOpen: false, online: true });
