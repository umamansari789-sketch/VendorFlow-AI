import { supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export interface CurrentUser {
  email: string;
  name: string;
  demo: boolean;
}

/** Returns the signed-in user, or a demo identity when Supabase is not configured. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!supabaseConfigured) return { email: "demo@vendorflow.app", name: "Demo Reviewer", demo: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { email: user.email, name: user.email.split("@")[0], demo: false };
}
