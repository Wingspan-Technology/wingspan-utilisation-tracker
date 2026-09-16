import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rateId: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id, rateId } = await params;

  const rate = await prisma.developerRate.findUnique({ where: { id: rateId } });
  if (!rate || rate.userId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.developerRate.delete({ where: { id: rateId } });

  const rates = await prisma.developerRate.findMany({
    where: { userId: id },
    orderBy: { startDate: "asc" },
  });

  return Response.json(rates);
}
