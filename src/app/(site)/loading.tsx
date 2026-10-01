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
      <div className="relative">
        <Skeleton className="absolute inset-0 !rounded-none" />
        <div className="container-px relative flex min-h-[80vh] items-center py-16">
          <div className="w-full max-w-xl space-y-4">
            <Skeleton className="h-6 w-40 !rounded-full !bg-white/70" />
            <Skeleton className="h-12 w-full !bg-white/70" />
            <Skeleton className="h-12 w-3/4 !bg-white/70" />
            <Skeleton className="h-4 w-full !bg-white/70" />
            <Skeleton className="h-4 w-5/6 !bg-white/70" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-44 !rounded-lg !bg-white/70" />
              <Skeleton className="h-12 w-32 !rounded-lg !bg-white/70" />
            </div>
          </div>
        </div>
      </div>
      <div className="container-px mt-10 grid gap-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
      </div>
    </div>
  );
}
