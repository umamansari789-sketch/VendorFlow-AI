import Link from "next/link";
import { signInAction } from "@/app/auth-actions";
import { Notice, inputClass, primaryButton } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to VendorFlow AI</h1>
        {!supabaseConfigured && (
          <Notice tone="amber">Demo mode: Supabase is not configured, so no login is required.</Notice>
        )}
        {error && <Notice tone="red">{error}</Notice>}
        <form action={signInAction} className="mt-5 space-y-3">
          <input name="email" type="email" required placeholder="Email" className={inputClass} />
          <input name="password" type="password" required minLength={8} placeholder="Password" className={inputClass} />
          <button className={`${primaryButton} w-full`}>{supabaseConfigured ? "Sign in" : "Continue to demo"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
