import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  // Demo mode: no Supabase configured, so there is nothing to authenticate against.
  if (!supabaseConfigured) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
