/** Shared (client + server) helpers. Dates are plain 'YYYY-MM-DD' strings in local time. */

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'BGN', 'CHF', 'RON', 'PLN', 'CZK', 'HUF', 'SEK', 'NOK', 'DKK', 'TRY'];

export function toCents(input: string): number | null {
	const s = input.replace(/[\s ]/g, '').replace(/[^\d.,]/g, '');
	if (!s) return null;
	const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
	let whole = s;
	let frac = '';
	if (lastSep >= 0) {
		const after = s.slice(lastSep + 1);
		// a separator followed by 1-2 digits is a decimal point; otherwise it is a thousands separator
		if (after.length > 0 && after.length <= 2) {
			whole = s.slice(0, lastSep);
			frac = after;
		}
	}
	whole = whole.replace(/[.,]/g, '');
	if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return null;
	const cents = parseInt(whole || '0', 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
	return Number.isFinite(cents) ? cents : null;
}

export function centsToInput(c: number): string {
	return (c / 100).toFixed(2);
}

const fmtCache = new Map<string, Intl.NumberFormat>();
export function money(cents: number, cur = 'EUR'): string {
	let f = fmtCache.get(cur);
	if (!f) {
		try {
			f = new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 });
		} catch {
			f = new Intl.NumberFormat('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		fmtCache.set(cur, f);
	}
	return f.format(cents / 100);
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** Local "today" (not toISOString, which is UTC and gives yesterday just after midnight in Sofia). */
export function todayStr(d = new Date()): string {
	return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export const thisMonth = () => todayStr().slice(0, 7);

export function fmtDate(date: string): string {
	const [y, m, d] = date.split('-');
	return `${d}.${m}.${y}`;
}

export function addMonths(month: string, delta: number): string {
	const [y, m] = month.split('-').map(Number);
	const t = y * 12 + (m - 1) + delta;
	return `${Math.floor(t / 12)}-${p2((t % 12) + 1)}`;
}

export const daysInMonth = (month: string) => {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m, 0).getDate();
};

/** 0 = Monday */
export const firstWeekday = (month: string) => {
	const [y, m] = month.split('-').map(Number);
	return (new Date(y, m - 1, 1).getDay() + 6) % 7;
};

export function monthLabel(month: string): string {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function dayLabel(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const validMonth = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
