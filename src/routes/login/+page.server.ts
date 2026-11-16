import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, SESSION_DAYS, checkPassword, newSession } from '#lib/server/auth.ts';
import { clientIp, loginLimiter } from '#lib/server/ratelimit.ts';

export const actions = {
	default: async (event) => {
		const ip = clientIp(event);
		const wait = loginLimiter.blocked(ip);
		if (wait) {
			event.setHeaders({ 'Retry-After': String(wait) });
			return fail(429, { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.` });
		}
		const form = await event.request.formData();
		const password = String(form.get('password') ?? '');
		if (!password || !checkPassword(password)) {
			loginLimiter.fail(ip);
			return fail(401, { error: 'Wrong password' });
		}
		loginLimiter.reset(ip);
		const { token } = newSession();
		event.cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			// On by default. Set COOKIE_SECURE=false only for plain-http testing off localhost.
			secure: process.env.COOKIE_SECURE !== 'false',
			maxAge: SESSION_DAYS * 24 * 60 * 60
		});
		redirect(303, '/');
	}
};
