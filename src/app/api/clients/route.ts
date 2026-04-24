import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return Response.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name, isActive } = await req.json();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const existing = await prisma.client.findUnique({ where: { name } });
  if (existing) return Response.json({ error: "Client name already exists" }, { status: 409 });

  const client = await prisma.client.create({
    data: { name, isActive: isActive ?? true },
  });
  return Response.json(client, { status: 201 });
}
