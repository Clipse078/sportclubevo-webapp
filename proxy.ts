import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-sce-pathname", pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  return NextResponse.next();
}