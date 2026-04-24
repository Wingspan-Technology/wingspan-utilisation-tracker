import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: { project: { include: { client: true } } },
    orderBy: [
      { project: { client: { name: "asc" } } },
      { project: { name: "asc" } },
      { name: "asc" },
    ],
  });
  return Response.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { projectId, name, description, color, isActive, isBillable } = await req.json();
  if (!projectId || !name) {
    return Response.json({ error: "Project and name are required" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({
    where: { projectId_name: { projectId, name } },
  });
  if (existing) {
    return Response.json({ error: "Task name already exists for this project" }, { status: 409 });
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      name,
      description: description || null,
      color: color || "#6366f1",
      isActive: isActive ?? true,
      isBillable: isBillable ?? true,
    },
    include: { project: { include: { client: true } } },
  });
  return Response.json(task, { status: 201 });
}
