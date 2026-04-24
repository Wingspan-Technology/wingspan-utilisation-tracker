import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { clientId, name, isActive } = await req.json();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const newClientId = clientId ?? project.clientId;
  const newName = name ?? project.name;

  if (newClientId !== project.clientId || newName !== project.name) {
    const existing = await prisma.project.findUnique({
      where: { clientId_name: { clientId: newClientId, name: newName } },
    });
    if (existing && existing.id !== id) {
      return Response.json({ error: "Project name already exists for this client" }, { status: 409 });
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { clientId: newClientId, name: newName, isActive: isActive ?? project.isActive },
    include: { client: true },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const hasTasks = await prisma.task.count({ where: { projectId: id } });
  if (hasTasks > 0) {
    return Response.json(
      { error: "Cannot delete a project that has tasks. Deactivate it instead." },
      { status: 409 }
    );
  }

  await prisma.project.delete({ where: { id } });
  return Response.json({ ok: true });
}
