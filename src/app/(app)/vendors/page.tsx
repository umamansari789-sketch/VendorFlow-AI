import Link from "next/link";
import { addVendorAction } from "@/app/actions";
import { Card, Notice, PageHeader, VendorStatusBadge, inputClass, primaryButton } from "@/components/ui";
import { VENDOR_CATEGORIES, listGaps, listVendors } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function VendorsPage(props: PageProps<"/vendors">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const vendors = listVendors();

  return (
    <>
      <PageHeader title="Vendors" description="Every vendor and their current compliance status." />
      {error && <Notice tone="red">{error}</Notice>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Open gaps</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/vendors/${v.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {v.name}
                    </Link>
                    <p className="text-xs text-slate-500">{v.contactEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{v.category}</td>
                  <td className="px-5 py-3 text-slate-600">{v.location}</td>
                  <td className="px-5 py-3 text-slate-600">{listGaps({ status: "open_all", vendorId: v.id }).length}</td>
                  <td className="px-5 py-3">
                    <VendorStatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Add a vendor</h2>
        <p className="mt-1 text-xs text-slate-500">Required documents are assigned automatically from the vendor category.</p>
        <form action={addVendorAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input name="name" required placeholder="Vendor name" className={inputClass} />
          <select name="category" className={inputClass} defaultValue="Cleaning">
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input name="location" placeholder="Location / property" className={inputClass} />
          <input name="contactName" placeholder="Contact name" className={inputClass} />
          <input name="contactEmail" type="email" required placeholder="Contact email" className={inputClass} />
          <button className={primaryButton}>Add vendor</button>
        </form>
      </Card>
    </>
  );
}
