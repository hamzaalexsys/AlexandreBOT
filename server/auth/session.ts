import { env } from "cloudflare:workers";
import type { Role } from "@/lib/contracts";
export type Session = {
  role: Role;
  subject: string;
  mode: "demo" | "pilot";
  enrollmentId?: number;
  expires: number;
  nonce: string;
};
const encoder = new TextEncoder();
const localPilotSessionSeconds = 8 * 60 * 60;
async function key() {
  const secret = (env as Record<string, unknown>).SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 32)
    throw new Error("SESSION_NOT_CONFIGURED");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function decode(text: string) {
  return Uint8Array.from(
    atob(text.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
export async function createSession(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "ORIGIN_REJECTED" }, { status: 403 });
  try {
    const data = (await req.json()) as { role?: string };
    if (!["student", "parent"].includes(data.role || ""))
      return Response.json({ error: "INVALID_ROLE" }, { status: 400 });
    const config = env as Record<string, string | undefined>;
    const enrollmentId = Number(config.PILOT_ENROLLMENT_ID || 0);
    if (
      data.role === "parent" &&
      (!Number.isSafeInteger(enrollmentId) ||
        enrollmentId <= 0 ||
        !config.SCHOOL_GATEWAY_URL ||
        !config.SCHOOL_GATEWAY_TOKEN)
    )
      throw new Error("PILOT_PARENT_NOT_CONFIGURED");
    const session: Session = {
      role: data.role as Role,
      subject: data.role === "parent" ? "pilot-parent" : "demo-student",
      mode: data.role === "parent" ? "pilot" : "demo",
      enrollmentId: data.role === "parent" ? enrollmentId : undefined,
      expires: Date.now() + localPilotSessionSeconds * 1000,
      nonce: crypto.randomUUID(),
    };
    const payload = encode(encoder.encode(JSON.stringify(session)));
    const sig = encode(
      new Uint8Array(
        await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)),
      ),
    );
    return Response.json(
      { role: session.role, mode: session.mode },
      {
        headers: {
          "Set-Cookie": `alex_session=${payload}.${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${localPilotSessionSeconds}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json({ error: "SESSION_UNAVAILABLE" }, { status: 503 });
  }
}
export async function getSession(req: Request): Promise<Session | null> {
  try {
    const token = req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("alex_session="))
      ?.slice(13);
    if (!token) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await key(),
        decode(sig),
        encoder.encode(payload),
      ))
    )
      return null;
    const session = JSON.parse(
      new TextDecoder().decode(decode(payload)),
    ) as Session;
    const baseValid =
      session.expires > Date.now() &&
      ["student", "parent"].includes(session.role);
    const modeValid =
      (session.mode === "demo" && session.role === "student") ||
      (session.mode === "pilot" &&
        session.role === "parent" &&
        session.subject === "pilot-parent" &&
        Number.isSafeInteger(session.enrollmentId) &&
        (session.enrollmentId || 0) > 0);
    return baseValid && modeValid ? session : null;
  } catch {
    return null;
  }
}
