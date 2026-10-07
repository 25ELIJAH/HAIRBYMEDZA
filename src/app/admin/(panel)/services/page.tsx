import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { deleteService, saveService, toggleService } from "@/lib/admin-actions";
import ImageUploadField from "@/components/ImageUploadField";
import { durationLabel, formatKes } from "@/lib/time";

export const dynamic = "force-dynamic";

type ServiceRow = Awaited<ReturnType<typeof prisma.service.findMany>>[number];

function ServiceForm({ service }: { service?: ServiceRow }) {
  return (
    <form action={saveService} className="grid gap-4 sm:grid-cols-2">
      {service && <input type="hidden" name="id" value={service.id} />}
      <label className="block sm:col-span-2">
        <span className="label">Service name</span>
        <input name="name" required defaultValue={service?.name} className="input" placeholder="e.g. Knotless" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Description</span>
        <textarea name="description" defaultValue={service?.description} className="input min-h-[60px]" />
      </label>
      <label className="block">
        <span className="label">Studio price (KES)</span>
        <input name="priceKes" type="number" min={0} defaultValue={service?.priceKes ?? 1500} className="input" />
      </label>
      <label className="block">
        <span className="label">Home visit price (KES)</span>
        <input name="outCallPriceKes" type="number" min={0} defaultValue={service?.outCallPriceKes ?? 3000} className="input" />
      </label>
      <label className="block">
        <span className="label">Category (group on the site)</span>
        <select name="category" defaultValue={service?.category ?? "Kids"} className="input">
          <option value="Kids">Kids</option>
          <option value="Teen">Teen</option>
          <option value="Package">Package</option>
          {service && !["Kids", "Teen", "Package"].includes(service.category) && (
            <option value={service.category}>{service.category}</option>
          )}
        </select>
      </label>
      <label className="block">
        <span className="label">Duration (minutes)</span>
        <input name="durationMin" type="number" min={15} step={15} defaultValue={service?.durationMin ?? 180} className="input" />
      </label>
      <label className="block">
        <span className="label">Buffer / prep after (minutes)</span>
        <input name="bufferMin" type="number" min={0} step={5} defaultValue={service?.bufferMin ?? 0} className="input" />
      </label>
      <div className="block sm:col-span-2">
        <span className="label">Service photo</span>
        <ImageUploadField defaultUrl={service?.imageUrl} />
      </div>
      <label className="block sm:col-span-2">
        <span className="label">Includes (one per line)</span>
        <textarea name="includes" defaultValue={service?.includes ?? ""} className="input min-h-[80px]" placeholder={"Wash\nBlow Dry\nBraiding\nStyling"} />
      </label>
      <label className="block">
        <span className="label">Sort order</span>
        <input name="sortOrder" type="number" defaultValue={service?.sortOrder ?? 0} className="input" />
      </label>
      <label className="flex items-end gap-2 pb-2">
        <input name="active" type="checkbox" defaultChecked={service?.active ?? true} className="h-4 w-4 accent-royal-600" />
        <span className="text-sm font-medium text-charcoal-soft">Active (bookable)</span>
      </label>
      <div className="sm:col-span-2">
        <button className="btn-primary">{service ? "Save changes" : "Create service"}</button>
      </div>
    </form>
  );
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <PageHeader title="Services & prices" subtitle={`${services.length} styles`} />

      <details className="group mb-4 rounded-xl border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-charcoal sm:px-5">
          Add a service
          <span className="font-medium text-royal-700 group-open:hidden">New</span>
          <span className="hidden font-medium text-charcoal-muted group-open:inline">Close</span>
        </summary>
        <div className="border-t border-gray-100 p-4 sm:p-5">
          <ServiceForm />
        </div>
      </details>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {services.map((s) => (
          <li key={s.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className={`h-12 w-12 shrink-0 rounded-lg object-cover ${s.active ? "" : "opacity-50"}`} />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-medium ${s.active ? "text-charcoal" : "text-charcoal-muted"}`}>
                    {s.name}
                    {!s.active && <span className="ml-2 text-xs font-normal">Hidden</span>}
                  </span>
                  <span className="block truncate text-[13px] tabular-nums text-charcoal-muted">
                    {formatKes(s.priceKes)} · {durationLabel(s.durationMin)}<span className="hidden sm:inline"> · Home {formatKes(s.outCallPriceKes)}</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-royal-700 group-open:hidden">Edit</span>
                <span className="hidden shrink-0 text-sm font-medium text-charcoal-muted group-open:inline">Close</span>
              </summary>
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5">
                <ServiceForm service={s} />
                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                  <form action={toggleService.bind(null, s.id, !s.active)}>
                    <button className="btn-outline !px-3 !py-2 text-xs">
                      {s.active ? "Hide from website" : "Show on website"}
                    </button>
                  </form>
                  <form action={deleteService.bind(null, s.id)}>
                    <button className="btn !px-3 !py-2 text-xs text-red-600 hover:bg-red-50">Delete service</button>
                  </form>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
