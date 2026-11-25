import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vendors", label: "Vendors" },
  { href: "/gaps", label: "Gap resolution" },
  { href: "/audit", label: "Audit trail" },
  { href: "/billing", label: "Billing" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">
            Vendor<span className="text-indigo-600">Flow</span> AI
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 py-4 md:mt-8 md:block">
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <form action={signOutAction} className="mt-2">
            <button className="text-xs font-medium text-indigo-600 hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        {user.demo && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">
            Demo mode — sample data is stored in memory and resets on restart. Add Supabase keys to enable login and persistence.
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
