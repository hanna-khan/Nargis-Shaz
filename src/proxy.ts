import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for Studio: requests without a staff session cookie are sent to sign-in before any
 * page work happens. The real check (session lookup + permissions) runs on the server in every
 * Studio layout, page, Server Action and Route Handler.
 */
const PUBLIC = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !PUBLIC.some((p) => pathname.startsWith(p)) && !req.cookies.has("ns_staff")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
