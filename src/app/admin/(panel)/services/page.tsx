import { prisma } from "@/lib/prisma";
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
        <span className="label">In-call price (KES)</span>
        <input name="priceKes" type="number" min={0} defaultValue={service?.priceKes ?? 1500} className="input" />
      </label>
      <label className="block">
        <span className="label">Out-call price (KES)</span>
        <input name="outCallPriceKes" type="number" min={0} defaultValue={service?.outCallPriceKes ?? 3000} className="input" />
      </label>
      <label className="block">
        <span className="label">Category</span>
        <input name="category" defaultValue={service?.category ?? "Kids"} className="input" />
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
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-charcoal">Services</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Durations drive the smart calendar. They control how much time each booking blocks.
        </p>
      </header>

      <details className="card mb-6 p-5">
        <summary className="cursor-pointer font-display text-lg font-semibold text-royal-700">
          + Add a new service
        </summary>
        <div className="mt-5">
          <ServiceForm />
        </div>
      </details>

      <div className="grid gap-4">
        {services.map((s) => (
          <div key={s.id} className={`card p-5 ${s.active ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt={s.name} className="h-14 w-14 rounded-xl object-cover" />
                )}
                <div>
                  <h3 className="font-display text-lg font-semibold text-charcoal">
                    {s.name}{" "}
                    {!s.active && <span className="badge bg-gray-100 text-gray-500">Inactive</span>}
                  </h3>
                  <p className="text-sm text-charcoal-muted">
                    In {formatKes(s.priceKes)} · Out {formatKes(s.outCallPriceKes)} ·{" "}
                    {durationLabel(s.durationMin)}
                    {s.bufferMin ? ` · +${s.bufferMin}m buffer` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <form action={toggleService.bind(null, s.id, !s.active)}>
                  <button className="btn-outline !px-3 !py-1.5 text-xs">
                    {s.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <form action={deleteService.bind(null, s.id)}>
                  <button className="btn !px-3 !py-1.5 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </form>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-royal-600">
                Edit details ▾
              </summary>
              <div className="mt-4 border-t border-black/5 pt-4">
                <ServiceForm service={s} />
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
