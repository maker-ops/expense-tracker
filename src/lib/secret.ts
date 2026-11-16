import { getEarningsToken } from './api';
import { ui } from './state.svelte';

/** Shared by both hidden triggers: reopen straight away if still unlocked, else ask for the PIN. */
export function triggerSecret() {
	if (getEarningsToken()) ui.vaultOpen = true;
	else ui.pinOpen = true;
}

/** Tap counter for the "month total x5" trigger. */
export function makeTapCounter(taps = 5, withinMs = 2000) {
	let times: number[] = [];
	return () => {
		const now = Date.now();
		times = times.filter((t) => now - t < withinMs);
		times.push(now);
		if (times.length >= taps) {
			times = [];
			triggerSecret();
		}
	};
}
