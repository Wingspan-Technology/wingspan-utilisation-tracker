import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return Response.json(
        { error: "Your account has been deactivated" },
        { status: 403 }
      );
    }

    await setSessionCookie({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return Response.json({ role: user.role, name: user.name });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
