import { currency, lookups, titleSuggestions } from '#lib/server/queries.ts';

export function load({ locals }) {
	// Not signed in (login page): expose nothing.
	if (!locals.sid) {
		return {
			authed: false as const,
			...({ people: [], groups: [], categories: [] } as ReturnType<typeof lookups>),
			currency: 'EUR',
			titles: [] as ReturnType<typeof titleSuggestions>
		};
	}
	return { authed: true as const, ...lookups(), currency: currency(), titles: titleSuggestions('expense') };
}
