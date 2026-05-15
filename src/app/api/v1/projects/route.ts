import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKeyFromRequest } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKeyFromRequest(req);
  if (!apiKey) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const projects = await prisma.project.findMany({
    where,
    include: { client: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  return Response.json({ data: projects });
}
