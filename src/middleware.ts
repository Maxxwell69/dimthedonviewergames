import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (path === "/register") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!secret) {
    if (path.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret,
  });

  const isAuthed = Boolean(token);

  if (path.startsWith("/dashboard") && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (path === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
