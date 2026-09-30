import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

// Macs sandboxed by Codex block FSEvents, so previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

// Node.js target: the Cloudflare Workers plugin was removed so `vinext build`
// emits a standalone Node server (see next.config.ts) for Azure Container Apps.
export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [vinext(), sites()],
});
