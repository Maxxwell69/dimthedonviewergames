import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Auth temporarily disabled — keep register closed, send login to the wheel. */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/login" || path === "/register") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
