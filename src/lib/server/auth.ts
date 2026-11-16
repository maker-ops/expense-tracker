import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'session';
export const SESSION_DAYS = 30;

let appHash = '';
let pinHash = '';
let secret = '';

export function earningsTtlSeconds() {
	const n = Number(process.env.EARNINGS_TTL_SECONDS);
	return Number.isFinite(n) && n > 0 ? n : 600;
}

/** Validates env + hashes secrets in memory. Called from the `init` hook (container start). */
export function initAuth() {
	const pw = process.env.APP_PASSWORD;
	const sec = process.env.SESSION_SECRET;
	const pin = process.env.EARNINGS_PIN;
	if (!pw) throw new Error('APP_PASSWORD env var is required');
	if (!sec || sec.length < 32) throw new Error('SESSION_SECRET env var is required (min 32 chars)');
	const weak = /^(change-me|generate-with|dev-only|local-only|demo-password|dev-password)/i;
	if (weak.test(sec) || weak.test(pw) || pw.length < 8)
		console.warn('[auth] WARNING: APP_PASSWORD/SESSION_SECRET look like placeholders or are too short');
	secret = sec;
	appHash = bcrypt.hashSync(pw, 12);
	if (pin) {
		if (!/^\d{4,6}$/.test(pin)) console.warn('[auth] EARNINGS_PIN should be 4-6 digits; earnings menu disabled');
		else pinHash = bcrypt.hashSync(pin, 12);
	} else console.warn('[auth] EARNINGS_PIN not set; earnings menu disabled');
}

export const checkPassword = (pw: string) => bcrypt.compareSync(pw, appHash);
export const checkPin = (pin: string) => !!pinHash && /^\d{4,6}$/.test(pin) && bcrypt.compareSync(pin, pinHash);

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (data: string) => createHmac('sha256', secret).update(data).digest();

function sign(payload: Record<string, unknown>) {
	const body = b64(JSON.stringify(payload));
	return `${body}.${b64(mac(body))}`;
}

function verify<T extends { exp: number }>(token: string | null | undefined): T | null {
	if (!token) return null;
	const [body, sig] = token.split('.');
	if (!body || !sig) return null;
	const expected = mac(body);
	let given: Buffer;
	try {
		given = Buffer.from(sig, 'base64url');
	} catch {
		return null;
	}
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	try {
		const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as T;
		return p.exp > Date.now() ? p : null;
	} catch {
		return null;
	}
}

export function newSession() {
	const sid = randomBytes(12).toString('hex');
	return { sid, token: sign({ k: 's', sid, exp: Date.now() + SESSION_DAYS * 864e5 }) };
}

export function readSession(token: string | undefined) {
	const p = verify<{ k: string; sid: string; exp: number }>(token);
	return p && p.k === 's' ? p.sid : null;
}

/** Earnings unlock token: bound to the session, fixed expiry, held only in sessionStorage by the client. */
export function newEarningsToken(sid: string) {
	const exp = Date.now() + earningsTtlSeconds() * 1000;
	return { token: sign({ k: 'e', sid, exp }), expiresAt: exp };
}

export function earningsUnlocked(sid: string, token: string | null | undefined) {
	const p = verify<{ k: string; sid: string; exp: number }>(token);
	return !!p && p.k === 'e' && p.sid === sid;
}
