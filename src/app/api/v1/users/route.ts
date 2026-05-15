import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKeyFromRequest } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKeyFromRequest(req);
  if (!apiKey) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      dayRate: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ data: users });
}
