import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth);

  const isAuthPage = path === "/login" || path === "/register";
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/api/wheels") || path.startsWith("/api/wheel");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtected && !isLoggedIn) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/api/wheels/:path*", "/api/wheel/:path*"],
};
