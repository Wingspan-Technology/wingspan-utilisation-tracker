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
  const { name, isActive } = await req.json();

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });

  if (name && name !== client.name) {
    const existing = await prisma.client.findUnique({ where: { name } });
    if (existing) return Response.json({ error: "Client name already exists" }, { status: 409 });
  }

  const updated = await prisma.client.update({
    where: { id },
    data: { name: name ?? client.name, isActive: isActive ?? client.isActive },
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
  const hasProjects = await prisma.project.count({ where: { clientId: id } });
  if (hasProjects > 0) {
    return Response.json(
      { error: "Cannot delete a client that has projects. Deactivate it instead." },
      { status: 409 }
    );
  }

  await prisma.client.delete({ where: { id } });
  return Response.json({ ok: true });
}
