import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Skip authentication for Telegram API routes, PA API routes, auth callback, and Telegram auth page
  if (request.nextUrl.pathname.startsWith('/api/telegram/') || 
      request.nextUrl.pathname.startsWith('/api/pa/') ||
      request.nextUrl.pathname === '/auth/callback' ||
      request.nextUrl.pathname === '/auth/telegram') {
    return
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
