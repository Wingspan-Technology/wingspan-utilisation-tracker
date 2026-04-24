import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const projects = await prisma.project.findMany({
    where: clientId ? { clientId } : undefined,
    include: { client: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { clientId, name, isActive } = await req.json();
  if (!clientId || !name) {
    return Response.json({ error: "Client and name are required" }, { status: 400 });
  }

  const existing = await prisma.project.findUnique({
    where: { clientId_name: { clientId, name } },
  });
  if (existing) {
    return Response.json({ error: "Project name already exists for this client" }, { status: 409 });
  }

  const project = await prisma.project.create({
    data: { clientId, name, isActive: isActive ?? true },
    include: { client: true },
  });
  return Response.json(project, { status: 201 });
}
