import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (!session && pathname === "/") {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (session && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth"],
};
