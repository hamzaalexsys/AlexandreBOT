import { spawn } from "node:child_process";
import { connect } from "node:net";
import { resolve } from "node:path";

process.loadEnvFile(".env");

function isListening(host, port) {
  return new Promise((done) => {
    const socket = connect({ host, port });
    socket.setTimeout(500);
    socket.once("connect", () => { socket.destroy(); done(true); });
    socket.once("error", () => done(false));
    socket.once("timeout", () => { socket.destroy(); done(false); });
  });
}

let gateway;
const endpoint = process.env.SCHOOL_GATEWAY_URL;
if (endpoint) {
  const url = new URL(endpoint);
  if (["127.0.0.1", "localhost"].includes(url.hostname)) {
    const host = "127.0.0.1";
    const port = Number(url.port || 80);
    if (!await isListening(host, port)) {
      gateway = spawn(process.execPath, ["--env-file-if-exists=.env", "index.mjs"], {
        cwd: resolve("services/school-gateway"),
        stdio: "inherit",
        windowsHide: true,
        env: { ...process.env, PORT: String(port), HOST: host },
      });
      gateway.on("error", error => console.error("School gateway could not start:", error.message));
      for (let attempt = 0; attempt < 40 && !await isListening(host, port); attempt++)
        await new Promise(done => setTimeout(done, 500));
      if (!await isListening(host, port))
        console.error("School gateway is unavailable. Parent questions will wait for it to start.");
    }
  }
}

const web = spawn(process.execPath, [resolve("node_modules/vinext/dist/cli.js"), "dev", "--port", process.env.ALEXANDREBOT_DEV_PORT || "5173"], {
  stdio: "inherit",
  windowsHide: true,
});
web.on("error", error => console.error("Web server could not start:", error.message));
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  gateway?.kill();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
web.on("exit", (code) => {
  gateway?.kill();
  process.exitCode = code ?? 0;
});
