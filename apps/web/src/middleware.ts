import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "finpilot_session";

/**
 * Optimistic route guard: without a session cookie there is no point rendering a
 * protected page, so redirect to /login?next=<path>. The cookie is HttpOnly and only
 * the API can validate it; an expired cookie is caught client-side (401 → login).
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next !== "/") loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login page, the API proxy, Next internals and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
