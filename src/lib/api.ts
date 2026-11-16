import { goto } from '$app/navigation';

export class ApiError extends Error {
	constructor(
		message: string,
		public status = 0
	) {
		super(message);
	}
}

const KEY = 'et';

export function getEarningsToken(): { token: string; expiresAt: number } | null {
	try {
		const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
		if (v && typeof v.token === 'string' && v.expiresAt > Date.now()) return v;
		sessionStorage.removeItem(KEY);
	} catch {
		/* ignore */
	}
	return null;
}
export function setEarningsToken(v: { token: string; expiresAt: number }) {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(v));
	} catch {
		/* ignore */
	}
}
export function clearEarningsToken() {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		/* ignore */
	}
}

function headers(url: string, json: boolean): Record<string, string> {
	const h: Record<string, string> = {};
	if (json) h['Content-Type'] = 'application/json';
	if (/^\/api\/(earnings|export|import)/.test(url)) {
		const t = getEarningsToken();
		if (t) h['x-earnings-token'] = t.token;
	}
	return h;
}

async function request(method: string, url: string, body?: unknown, raw?: BodyInit) {
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers: headers(url, raw === undefined && body !== undefined),
			body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
		});
	} catch {
		throw new ApiError("You're offline. Try again when you're back online.");
	}
	if (res.status === 401) {
		goto('/login');
		throw new ApiError('Session expired', 401);
	}
	return res;
}

export async function api<T = any>(method: string, url: string, body?: unknown): Promise<T> {
	const res = await request(method, url, body);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
	return data as T;
}

export async function apiRaw<T = any>(url: string, text: string): Promise<T> {
	const res = await request('POST', url, undefined, text);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
	return data as T;
}

export async function download(url: string, filename: string) {
	const res = await request('GET', url);
	if (!res.ok) throw new ApiError('Download failed', res.status);
	const blob = await res.blob();
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
