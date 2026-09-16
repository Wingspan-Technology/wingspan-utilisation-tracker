import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { dayRate, startDate } = await req.json();

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    return Response.json({ error: "A valid start date is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.developerRate.findUnique({
    where: { userId_startDate: { userId: id, startDate: new Date(startDate) } },
  });
  if (existing) {
    return Response.json({ error: "A rate already starts on that date" }, { status: 409 });
  }

  await prisma.developerRate.create({
    data: {
      userId: id,
      dayRate: dayRate != null ? parseFloat(dayRate) : null,
      startDate: new Date(startDate),
    },
  });

  const rates = await prisma.developerRate.findMany({
    where: { userId: id },
    orderBy: { startDate: "asc" },
  });

  return Response.json(rates, { status: 201 });
}
