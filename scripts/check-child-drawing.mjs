import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

const width = 800;
const height = 500;
const pixels = Buffer.alloc(height * (1 + width * 3), 255);
for (let y = 0; y < height; y++) pixels[y * (1 + width * 3)] = 0;

function dot(x, y, radius = 4) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const offset = py * (1 + width * 3) + 1 + px * 3;
      pixels[offset] = 127;
      pixels[offset + 1] = 114;
      pixels[offset + 2] = 206;
    }
  }
}

function line(x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step++) {
    const amount = step / steps;
    dot(x0 + (x1 - x0) * amount, y0 + (y1 - y0) * amount);
  }
}

line(120, 190, 190, 300);
line(190, 190, 120, 300);
line(255, 245, 335, 245);
line(295, 205, 295, 285);
line(405, 220, 430, 195);
line(430, 195, 430, 300);
line(505, 230, 585, 230);
line(505, 275, 585, 275);
for (let degrees = 0; degrees <= 360; degrees += 2) {
  const angle = (degrees * Math.PI) / 180;
  dot(680 + Math.cos(angle) * 45, 247 + Math.sin(angle) * 62);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const head = Buffer.alloc(4);
  const tail = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  tail.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([head, name, data, tail]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(width);
header.writeUInt32BE(height, 4);
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
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const image = `data:image/png;base64,${png.toString("base64")}`;
const scene = {
  id: "blank-entry",
  title: "Ton tableau est prêt",
  subtitle: "Dessine puis demande à Milo.",
  shapes: [],
  simulation: null,
};

async function ask(message) {
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      lang: "fr",
      age: 9,
      history: [],
      scene,
      image,
      childDrawing: { strokeCount: 9 },
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.source, "openrouter");
  return data;
}

const solved = await ask("Résous maintenant l’équation que j’ai dessinée.");
assert.equal(solved.boardAction, "update");
assert.ok(solved.scene?.shapes.length >= 2);
assert.match(
  `${solved.message} ${JSON.stringify(solved.scene)}`,
  /x\s*=\s*(?:-|−)\s*1/i,
);
assert.doesNotMatch(solved.message, /tableau (?:est )?vide/i);

const inspected = await ask("J’ai dessiné quoi ?");
assert.equal(inspected.boardAction, "keep");
assert.equal(inspected.scene, null);
assert.doesNotMatch(inspected.message, /renard|tableau (?:est )?vide/i);
assert.match(inspected.message, /x|équation|equation/i);

console.log(
  "PASS child drawing vision: equation solved on current page and inspected without mutation",
);
