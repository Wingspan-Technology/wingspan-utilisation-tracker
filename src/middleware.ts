import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = await fetch(new URL("/api/auth/get-session", req.url), {
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });

  const data = res.ok ? await res.json() : null;
  const user = data?.user as { role?: string } | null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user.role === "USER" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*) "],
};
