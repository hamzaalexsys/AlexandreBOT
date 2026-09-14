import { getSession } from "@/server/auth/session";
import {
  repositoryFor,
  type SchoolRead,
} from "@/server/school/repository";
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session || session.role !== "parent")
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const lang = new URL(req.url).searchParams.get("lang") === "ar" ? "ar" : "fr";
  const repo = repositoryFor(session);
  const sections: SchoolRead[] = [
    "overview",
    "learning",
    "attendance",
    "messages",
    "homework",
    "journey",
    "yearResults",
    "subjectResults",
    "termResults",
  ];
  const [
    overview,
    learning,
    attendance,
    messages,
    homework,
    journey,
    yearResults,
    subjectResults,
    termResults,
  ] = await Promise.all(
    sections.map((section) => repo.read(section, session, lang)),
  );
  return Response.json(
    {
      overview,
      learning,
      attendance,
      messages,
      homework,
      journey,
      yearResults,
      subjectResults,
      termResults,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
