import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKeyFromRequest } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKeyFromRequest(req);
  if (!apiKey) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const tasks = await prisma.task.findMany({
    where,
    include: { project: { include: { client: true } } },
    orderBy: [{ project: { name: "asc" } }, { name: "asc" }],
  });

  return Response.json({ data: tasks });
}
