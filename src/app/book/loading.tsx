import { LoadingLabel, ServiceCardSkeleton, Skeleton } from "@/components/Skeleton";

// Skeleton of the booking page, shown while services and hours load.
export default function Loading() {
  return (
    <div className="min-h-screen bg-cream-soft">
      <LoadingLabel text="Loading booking page…" />
      <div className="border-b border-gray-200 bg-white">
        <div className="container-px flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 !rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="container-px py-8 sm:py-10">
        <Skeleton className="h-2 w-full max-w-5xl" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-3 h-4 w-72" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
            </div>
          </div>
          <div className="hidden space-y-3 rounded-xl border border-gray-200 bg-white p-5 lg:block">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-8 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
