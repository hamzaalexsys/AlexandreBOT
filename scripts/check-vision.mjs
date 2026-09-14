import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
// A generated, non-personal fixture: one orange circle and one blue square.
const w = 256,
  h = 128,
  pixels = Buffer.alloc(h * (1 + w * 3), 255);
for (let y = 0; y < h; y++) {
  pixels[y * (1 + w * 3)] = 0;
  for (let x = 0; x < w; x++) {
    const color =
      (x - 65) ** 2 + (y - 64) ** 2 < 36 ** 2
        ? [245, 125, 35]
        : x >= 157 && x < 227 && y >= 29 && y < 99
          ? [35, 110, 230]
          : [255, 255, 255];
    for (let c = 0; c < 3; c++)
      pixels[y * (1 + w * 3) + 1 + x * 3 + c] = color[c];
  }
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    head = Buffer.alloc(4),
    tail = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  tail.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([head, name, data, tail]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(w);
header.writeUInt32BE(h, 4);
header[8] = 8;
header[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(pixels)),
  chunk("IEND", Buffer.alloc(0)),
]);
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const login = await fetch(`${base}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "student" }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie").split(";")[0];
const response = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    message:
      "Quelles sont les deux formes colorées sur cette image ? Décris leur forme et leur couleur en une phrase, sans modifier notre tableau.",
    lang: "fr",
    age: 9,
    history: [],
    image: `data:image/png;base64,${png.toString("base64")}`,
  }),
});
const data = await response.json();
assert.equal(response.status, 200, JSON.stringify(data));
assert.equal(data.boardAction, "keep");
assert.match(data.message, /orange/i);
assert.match(data.message, /bleu/i);
assert.match(data.message, /carré/i);
assert.match(data.message, /cercle|rond|disque/i);
console.log("PASS real vision: " + data.message);
