import { Skeleton } from "@/components/ui/Skeleton";

export default function MotorcyclesLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 max-w-md rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 h-48 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/3 rounded" />
              <Skeleton className="h-7 w-3/4 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
