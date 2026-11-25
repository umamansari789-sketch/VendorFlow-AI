"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const CredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
  if (!supabaseConfigured) redirect("/dashboard");
  const parsed = CredentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/login", parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) fail("/login", error.message);

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!membership) {
    const { data: userData } = await supabase.auth.getUser();
    const orgName =
      typeof userData.user?.user_metadata?.organization === "string"
        ? userData.user.user_metadata.organization
        : "My Organization";
    const { error: orgError } = await supabase.rpc("create_organization", { org_name: orgName });
    if (orgError) console.error("create_organization failed:", orgError.message);
  }
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  if (!supabaseConfigured) redirect("/dashboard");
  const parsed = CredentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/signup", parsed.error.issues[0].message);
  const supabase = await createClient();
  const orgName = String(formData.get("organization") ?? "").trim() || "My Organization";
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { data: { organization: orgName } },
  });
  if (error) fail("/signup", error.message);
  if (!data.session) redirect("/login?error=" + encodeURIComponent("Check your email to confirm your account, then sign in."));

  const { error: orgError } = await supabase.rpc("create_organization", { org_name: orgName });
  if (orgError) console.error("create_organization failed:", orgError.message);
  redirect("/dashboard");
}

export async function signOutAction() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
