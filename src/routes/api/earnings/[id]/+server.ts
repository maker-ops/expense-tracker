import { entryHandlers } from '#lib/server/entryApi.ts';

const h = entryHandlers('earning');
export const PATCH = h.update;
export const DELETE = h.remove;
