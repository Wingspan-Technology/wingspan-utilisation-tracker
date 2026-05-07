import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { email, name, role, isActive, dayRate } = await req.json();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email: email ? email.toLowerCase() : user.email,
      name: name ?? user.name,
      role: role === "ADMIN" ? "ADMIN" : role === "USER" ? "USER" : user.role,
      isActive: isActive ?? user.isActive,
      dayRate: dayRate !== undefined ? (dayRate != null ? parseFloat(dayRate) : null) : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      dayRate: true,
      createdAt: true,
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.sub) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.timeEntry.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return Response.json({ ok: true });
}
