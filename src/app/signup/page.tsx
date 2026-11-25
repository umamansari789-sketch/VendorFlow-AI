import Link from "next/link";
import { signUpAction } from "@/app/auth-actions";
import { Notice, inputClass, primaryButton } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create your workspace</h1>
        {!supabaseConfigured && (
          <Notice tone="amber">Demo mode: Supabase is not configured, so no account is created.</Notice>
        )}
        {error && <Notice tone="red">{error}</Notice>}
        <form action={signUpAction} className="mt-5 space-y-3">
          <input name="organization" required placeholder="Company name" className={inputClass} />
          <input name="email" type="email" required placeholder="Work email" className={inputClass} />
          <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className={inputClass} />
          <button className={`${primaryButton} w-full`}>Create account</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
