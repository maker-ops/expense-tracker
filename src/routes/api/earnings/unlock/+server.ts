import { json } from '@sveltejs/kit';
import { checkPin, newEarningsToken } from '#lib/server/auth.ts';
import { clientIp, pinLimiter } from '#lib/server/ratelimit.ts';

// Requires the main session (enforced in hooks). Returns a session-bound token with a fixed expiry;
// the client keeps it in sessionStorage only. There is no cookie, so other tabs stay locked.
export async function POST(event) {
	const ip = clientIp(event);
	const wait = pinLimiter.blocked(ip);
	if (wait) return json({ error: 'Too many attempts' }, { status: 429, headers: { 'Retry-After': String(wait) } });
	let pin = '';
	try {
		pin = String((await event.request.json()).pin ?? '');
	} catch {
		/* fallthrough */
	}
	if (!checkPin(pin)) {
		pinLimiter.fail(ip);
		return json({ error: 'Wrong PIN' }, { status: 403 });
	}
	pinLimiter.reset(ip);
	return json(newEarningsToken(event.locals.sid));
}
