import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKeyFromRequest } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKeyFromRequest(req);
  if (!apiKey) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const taskId = searchParams.get("taskId");
  const projectId = searchParams.get("projectId");
  const clientId = searchParams.get("clientId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (taskId) where.taskId = taskId;
  if (projectId) where.task = { projectId };
  if (clientId) where.task = { project: { clientId } };
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from + "T00:00:00.000Z");
    if (to) (where.date as Record<string, Date>).lte = new Date(to + "T23:59:59.999Z");
  }

  const [total, entries] = await Promise.all([
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      include: {
        task: { include: { project: { include: { client: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return Response.json({
    data: entries.map((e) => ({ ...e, date: e.date.toISOString().split("T")[0] })),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
