// Grey placeholder blocks with a soft shimmer, shown while a page loads.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Skeleton for one service card (image, title, text, prices). */
export function ServiceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <Skeleton className="aspect-[4/3] w-full !rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton grid of time slots while availability loads. */
export function SlotGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Loading available times">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

/** Screen-reader announcement for skeleton screens. */
export function LoadingLabel({ text = "Loading…" }: { text?: string }) {
  return (
    <span className="sr-only" role="status">
      {text}
    </span>
  );
}
