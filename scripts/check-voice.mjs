import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
await mkdir('.sites-runtime', { recursive: true });
await build({
  entryPoints: ['scripts/voice.test.ts'], outfile: '.sites-runtime/check-voice.mjs',
  bundle: true, platform: 'node', format: 'esm', packages: 'external',
});
// Test configuration, read by lib/server-env.ts through process.env.
Object.assign(process.env, {
  SESSION_SECRET: 'voice-test-secret-at-least-thirty-two-characters',
  OPENROUTER_API_KEY: 'test-only',
  SCHOOL_GATEWAY_URL: 'http://127.0.0.1:8788',
  SCHOOL_GATEWAY_TOKEN: 'x'.repeat(64),
  PILOT_ENROLLMENT_ID: '123',
});
await import(pathToFileURL(resolve('.sites-runtime/check-voice.mjs')).href);
