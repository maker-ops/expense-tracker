import type { RequestEvent } from '@sveltejs/kit';

type Entry = { count: number; resetAt: number };
const WINDOW = 15 * 60 * 1000;
const MAX = 5;

export function clientIp(event: RequestEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

export function createLimiter(max = MAX, windowMs = WINDOW) {
	const hits = new Map<string, Entry>();
	return {
		/** seconds to wait if blocked, else 0 */
		blocked(key: string): number {
			const e = hits.get(key);
			if (!e) return 0;
			if (e.resetAt <= Date.now()) {
				hits.delete(key);
				return 0;
			}
			return e.count >= max ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0;
		},
		fail(key: string) {
			const now = Date.now();
			const e = hits.get(key);
			if (!e || e.resetAt <= now) hits.set(key, { count: 1, resetAt: now + windowMs });
			else e.count++;
			if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
		},
		reset(key: string) {
			hits.delete(key);
		}
	};
}

export const loginLimiter = createLimiter();
export const pinLimiter = createLimiter();
