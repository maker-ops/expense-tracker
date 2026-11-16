import { json, redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, earningsUnlocked, initAuth, readSession } from '#lib/server/auth.ts';
import { getSqlite, initDb } from '#lib/server/db.ts';
import { seedDemo } from '#lib/server/seed.ts';

/** Runs once at server start (container start): env validation, password hashing, migrations. */
export const init: ServerInit = async () => {
	initAuth();
	initDb();
	if (process.env.SEED_DEMO === '1') {
		const n = (getSqlite().prepare('SELECT COUNT(*) AS n FROM expenses').get() as { n: number }).n;
		if (n === 0) seedDemo();
	}
};

const PUBLIC = new Set(['/login', '/api/health']);

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isApi = pathname.startsWith('/api/');
	const sid = readSession(event.cookies.get(SESSION_COOKIE));
	event.locals.sid = sid ?? '';

	if (!sid && !PUBLIC.has(pathname)) {
		if (isApi) return json({ error: 'Unauthorized' }, { status: 401 });
		redirect(303, '/login');
	}
	if (sid && pathname === '/login' && event.request.method === 'GET') redirect(303, '/');

	// Earnings API: needs the main session AND a valid, session-bound earnings-unlock token.
	// Answer 404 (not 401/403) so a locked client learns nothing about what exists.
	if (pathname.startsWith('/api/earnings') && pathname !== '/api/earnings/unlock') {
		if (!earningsUnlocked(event.locals.sid, event.request.headers.get('x-earnings-token'))) {
			return json({ error: 'Not found' }, { status: 404 });
		}
	}

	const res = await resolve(event);
	res.headers.set('X-Content-Type-Options', 'nosniff');
	res.headers.set('X-Frame-Options', 'DENY');
	res.headers.set('Referrer-Policy', 'same-origin');
	res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (event.request.headers.get('x-forwarded-proto') === 'https' || event.url.protocol === 'https:')
		res.headers.set('Strict-Transport-Security', 'max-age=31536000');
	if (isApi || pathname === '/login') res.headers.set('Cache-Control', 'no-store');
	return res;
};
