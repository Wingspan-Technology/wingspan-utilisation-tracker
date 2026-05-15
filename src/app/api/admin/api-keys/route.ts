import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-keys";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      label: true,
      hint: true,
      createdAt: true,
      lastUsedAt: true,
      isActive: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { label } = await req.json();
  if (!label?.trim()) {
    return Response.json({ error: "Label is required" }, { status: 400 });
  }

  const { raw, hash, hint } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      label: label.trim(),
      keyHash: hash,
      hint,
      createdById: session.sub,
    },
    select: {
      id: true,
      label: true,
      hint: true,
      createdAt: true,
      lastUsedAt: true,
      isActive: true,
      createdBy: { select: { name: true } },
    },
  });

  return Response.json({ ...apiKey, rawKey: raw }, { status: 201 });
}
