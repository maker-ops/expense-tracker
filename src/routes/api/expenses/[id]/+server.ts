import { entryHandlers } from '#lib/server/entryApi.ts';

const h = entryHandlers('expense');
export const PATCH = h.update;
export const DELETE = h.remove;
