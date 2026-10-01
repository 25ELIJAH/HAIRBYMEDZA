import { LoadingLabel, ServiceCardSkeleton, Skeleton } from "@/components/Skeleton";

// Skeleton of the home page, shown while it loads.
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <LoadingLabel />
      <div className="border-b border-gray-200">
        <div className="container-px flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 !rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-10 w-28 !rounded-lg" />
        </div>
      </div>
      <div className="container-px grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-10 w-3/4 max-w-sm" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-5/6 max-w-md" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-44 !rounded-lg" />
            <Skeleton className="h-12 w-36 !rounded-lg" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full !rounded-2xl" />
      </div>
      <div className="container-px grid gap-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
      </div>
    </div>
  );
}
