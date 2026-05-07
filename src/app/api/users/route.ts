import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      dayRate: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { email, name, role, isActive, dayRate } = await req.json();

  if (!email || !name) {
    return Response.json({ error: "Email and name are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      emailVerified: false,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      isActive: isActive ?? true,
      dayRate: dayRate != null ? parseFloat(dayRate) : null,
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

  return Response.json(user, { status: 201 });
}
