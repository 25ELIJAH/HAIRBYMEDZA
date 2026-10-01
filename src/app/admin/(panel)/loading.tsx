import { LoadingLabel, Skeleton } from "@/components/Skeleton";

// Skeleton shown inside the admin panel while a page loads.
export default function Loading() {
  return (
    <div>
      <LoadingLabel />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-8 w-56" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 !rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
