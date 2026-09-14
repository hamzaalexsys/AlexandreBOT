import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import sql from "mssql";
import { queryByName, privilegeCheck, requireIdentity } from "./queries.mjs";
const token = process.env.GATEWAY_SERVICE_TOKEN || "";
if (token.length < 48) throw new Error("GATEWAY_SERVICE_TOKEN_REQUIRED");
const identities = JSON.parse(process.env.VERIFIED_PARENT_MAPPINGS || "{}");
const pool = new sql.ConnectionPool({
  server: process.env.SQL_SERVER || "",
  database: process.env.SQL_DATABASE || "",
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    readOnlyIntent: true,
    enableArithAbort: true,
  },
  pool: { max: 4, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 10000,
});
await pool.connect();
const rights = await pool.request().query(privilegeCheck);
if (
  rights.recordset.length &&
  process.env.ALLOW_WRITE_CAPABLE_READONLY_TEST !== "true"
) {
  await pool.close();
  throw new Error(
    "WRITE_CAPABLE_PRINCIPAL_REJECTED: supply an existing SELECT-only school account; this service never changes permissions.",
  );
}
if (rights.recordset.length)
  process.stdout.write(
    "Local pilot override active; HTTP and SQL capability surfaces remain SELECT-only.\n",
  );
function authorised(req) {
  const supplied = Buffer.from(req.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${token}`);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const respond = (status, data) => {
    res.writeHead(status);
    res.end(JSON.stringify(data));
  };
  if (req.method !== "GET") return respond(405, { error: "READ_ONLY" });
  if (!authorised(req)) return respond(401, { error: "UNAUTHORISED" });
  try {
    const url = new URL(req.url, "http://gateway");
    if (url.pathname === "/health")
      return respond(200, { status: "ready", access: "select-only" });
    const name = url.pathname.replace(/^\/v1\//, "");
    const query = queryByName(name);
    const subject = req.headers["x-verified-subject"];
    const parentId = requireIdentity(subject, identities);
    const enrollmentId = Number(url.searchParams.get("enrollmentId") || 0);
    if (
      name !== "children" &&
      (!Number.isSafeInteger(enrollmentId) || enrollmentId <= 0)
    )
      return respond(400, { error: "INVALID_ENROLLMENT" });
    const request = pool
      .request()
      .input("parentId", sql.Int, parentId)
      .input("enrollmentId", sql.Int, enrollmentId);
    const data = await request.query(query);
    respond(200, {
      source: "school",
      readAt: new Date().toISOString(),
      items: data.recordset,
    });
  } catch (error) {
    console.warn("SCHOOL_QUERY_FAILURE", {
      code: typeof error?.code === "string" ? error.code : "unknown",
      number: Number.isInteger(error?.number) ? error.number : undefined,
    });
    const rejected = [
      "VERIFIED_IDENTITY_REQUIRED",
      "QUERY_NOT_ALLOWED",
    ].includes(error.message);
    respond(rejected ? 403 : 503, {
      error: rejected ? "FORBIDDEN" : "SCHOOL_UNAVAILABLE",
    });
  }
});
server.listen(
  Number(process.env.PORT) || 8788,
  process.env.HOST || "127.0.0.1",
  () => process.stdout.write("AlexandreBOT SELECT-only school gateway ready\n"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.close();
      process.exit(0);
    }),
  );
