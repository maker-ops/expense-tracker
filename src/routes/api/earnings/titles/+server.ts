import { json } from '@sveltejs/kit';
import { titleSuggestions } from '#lib/server/queries.ts';

export const GET = () => json({ titles: titleSuggestions('earning') });
