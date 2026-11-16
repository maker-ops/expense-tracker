import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/auth.ts';

export function POST({ cookies }) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
}
