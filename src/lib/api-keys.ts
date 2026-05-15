import crypto from "crypto";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export function generateApiKey(): { raw: string; hash: string; hint: string } {
  const raw = "wt_" + crypto.randomBytes(24).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const hint = raw.slice(-4);
  return { raw, hash, hint };
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function validateApiKeyFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7).trim();
  if (!raw) return null;

  const keyHash = hashKey(raw);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, isActive: true },
  });

  if (!apiKey?.isActive) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
