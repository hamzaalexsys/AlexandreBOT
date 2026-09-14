/** Server-only transport. The model never sees credentials, SQL or identifiers. */
export type SchoolParentIdentity = {
  mode: "pilot";
  subject: string;
  enrollmentId: number;
};
type Resource =
  | "children"
  | "learning"
  | "attendance"
  | "messages"
  | "homework"
  | "journey"
  | "yearResults"
  | "subjectResults"
  | "termResults";
type GatewayResult = {
  source: "school";
  readAt: string;
  items: Record<string, unknown>[];
};

export function createSchoolGatewayClient(config: {
  endpoint: string;
  token: string;
}) {
  const endpoint = new URL(config.endpoint);
  if (
    endpoint.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(endpoint.hostname)
  )
    throw new Error("GATEWAY_TLS_REQUIRED");
  if (config.token.length < 48) throw new Error("GATEWAY_TOKEN_REQUIRED");
  return {
    async read(
      resource: Resource,
      identity: SchoolParentIdentity,
    ): Promise<GatewayResult> {
      if (
        identity.mode !== "pilot" ||
        !identity.subject ||
        identity.subject.startsWith("demo-") ||
        !Number.isSafeInteger(identity.enrollmentId) ||
        identity.enrollmentId <= 0
      )
        throw new Error("VERIFIED_IDENTITY_REQUIRED");
      if (
        ![
          "children",
          "learning",
          "attendance",
          "messages",
          "homework",
          "journey",
          "yearResults",
          "subjectResults",
          "termResults",
        ].includes(resource)
      )
        throw new Error("RESOURCE_NOT_ALLOWED");
      const url = new URL(`/v1/${resource}`, endpoint);
      url.searchParams.set("enrollmentId", String(identity.enrollmentId));
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "X-Verified-Subject": identity.subject,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 403 ? "SCHOOL_FORBIDDEN" : "SCHOOL_UNAVAILABLE",
        );
      const data = (await response.json()) as GatewayResult;
      if (
        data.source !== "school" ||
        typeof data.readAt !== "string" ||
        !Array.isArray(data.items) ||
        data.items.length > 100
      )
        throw new Error("INVALID_SCHOOL_RESPONSE");
      return data;
    },
  };
}
