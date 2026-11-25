const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const size = 512;
const raw = Buffer.alloc(size * (size * 4 + 1));

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

for (let y = 0; y < size; y++) {
  const rowStart = y * (size * 4 + 1);
  raw[rowStart] = 0;
  for (let x = 0; x < size; x++) {
    const idx = rowStart + 1 + x * 4;
    const dx = x - 256;
    const dy = y - 256;
    const dist = Math.hypot(dx, dy);

    const rx = Math.max(Math.abs(dx) - 144, 0);
    const ry = Math.max(Math.abs(dy) - 144, 0);
    const cornerDist = Math.hypot(rx, ry);
    if (cornerDist > 112) {
      raw[idx] = 0;
      raw[idx + 1] = 0;
      raw[idx + 2] = 0;
      raw[idx + 3] = 0;
      continue;
    }

    const bgT = (x + y) / (size * 2);
    let r = lerp(24, 9, bgT);
    let g = lerp(24, 9, bgT);
    let b = lerp(27, 11, bgT);

    const t = Math.min(1, Math.max(0, (x + y) / (size * 2)));
    const ar = t < 0.5 ? lerp(16, 6, t * 2) : lerp(6, 139, (t - 0.5) * 2);
    const ag = t < 0.5 ? lerp(185, 182, t * 2) : lerp(182, 92, (t - 0.5) * 2);
    const ab = t < 0.5 ? lerp(129, 212, t * 2) : lerp(212, 246, (t - 0.5) * 2);

    if (Math.abs(dist - 184) < 13) {
      r = lerp(r, ar, 0.35);
      g = lerp(g, ag, 0.35);
      b = lerp(b, ab, 0.35);
    }

    if (Math.abs(dist - 142) < 9) {
      r = ar;
      g = ag;
      b = ab;
    }

    if (x >= 212 && x <= 344) {
      const ratio = (x - 212) / (344 - 212);
      const halfH = 82 * (1 - ratio);
      if (Math.abs(y - 256) <= halfH) {
        r = ar;
        g = ag;
        b = ab;
      }
    }

    raw[idx] = r;
    raw[idx + 1] = g;
    raw[idx + 2] = b;
    raw[idx + 3] = 255;
  }
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(process.cwd(), 'public', 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Generated icon:', outPath, png.length, 'bytes');
