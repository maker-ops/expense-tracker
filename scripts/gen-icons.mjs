// Generates PNG icons without any dependency: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc = (buf) => {
	let c = 0xffffffff;
	for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type), data]);
	const c = Buffer.alloc(4);
	c.writeUInt32BE(crc(td));
	return Buffer.concat([len, td, c]);
};

const BG = [0x0f, 0x11, 0x15];
const FG = [0x34, 0xd3, 0x99];
const PLUS = [0x04, 0x13, 0x0d];

/**
 * @param size    pixel size
 * @param scale   artwork scale (maskable icons keep art inside the 80% safe zone)
 * @param rounded draw rounded corners (non-maskable only; maskable/apple icons are full-bleed)
 */
function render(size, scale, rounded) {
	const raw = Buffer.alloc((size * 4 + 1) * size);
	const S = 4; // supersampling
	const r = size * 0.5 * 0.586 * scale; // circle radius
	const half = size * 0.5;
	const arm = r * 0.55;
	const thick = r * 0.27;
	const corner = size * 0.22;
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			let rr = 0, gg = 0, bb = 0, aa = 0;
			for (let sy = 0; sy < S; sy++)
				for (let sx = 0; sx < S; sx++) {
					const px = x + (sx + 0.5) / S;
					const py = y + (sy + 0.5) / S;
					let col = BG;
					let a = 1;
					if (rounded) {
						const dx = Math.max(corner - px, px - (size - corner), 0);
						const dy = Math.max(corner - py, py - (size - corner), 0);
						if (dx * dx + dy * dy > corner * corner) a = 0;
					}
					const dx = px - half, dy = py - half;
					if (dx * dx + dy * dy <= r * r) {
						col = FG;
						if ((Math.abs(dx) <= thick / 2 && Math.abs(dy) <= arm) || (Math.abs(dy) <= thick / 2 && Math.abs(dx) <= arm)) col = PLUS;
					}
					rr += col[0] * a; gg += col[1] * a; bb += col[2] * a; aa += a;
				}
			const o = y * (size * 4 + 1) + 1 + x * 4;
			const n = S * S;
			raw[o] = aa ? Math.round(rr / aa) : 0;
			raw[o + 1] = aa ? Math.round(gg / aa) : 0;
			raw[o + 2] = aa ? Math.round(bb / aa) : 0;
			raw[o + 3] = Math.round((aa / n) * 255);
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

mkdirSync('static/icons', { recursive: true });
const out = (name, size, scale, rounded) => writeFileSync(`static/icons/${name}.png`, render(size, scale, rounded));
out('icon-192', 192, 1, true);
out('icon-512', 512, 1, true);
out('maskable-192', 192, 0.8, false);
out('maskable-512', 512, 0.8, false);
out('apple-touch-icon', 180, 0.9, false);
console.log('icons written to static/icons');
