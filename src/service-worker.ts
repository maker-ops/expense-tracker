/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE = `shell-${version}`;
// App shell = hashed JS/CSS bundles + static files. Authenticated HTML and all data are never cached.
const SHELL: string[] = [...immutable, ...assets].map((f) => '/' + String(f.path).replace(/^\/+/, ''));

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	// Data: network only (/api, SvelteKit __data.json, form actions, logout)
	if (url.pathname.startsWith('/api/') || url.pathname.endsWith('/__data.json') || url.searchParams.has('x-sveltekit-invalidated')) return;

	// Pages: network first; if the network is down show the offline page
	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req).catch(async () => (await caches.match('/offline.html')) ?? Response.error())
		);
		return;
	}

	// Static shell assets: cache first
	if (SHELL.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(req)));
	}
});
