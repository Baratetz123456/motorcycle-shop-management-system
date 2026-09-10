import { Skeleton } from "@/components/ui/Skeleton";

export default function LegalLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 sm:p-12 max-w-7xl mx-auto space-y-8">
      <div className="space-y-3 pb-6 border-b border-white/10">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-10 w-3/4 max-w-xl rounded-2xl" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="hidden lg:block lg:col-span-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
        <div className="lg:col-span-8 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 bg-zinc-900/40 border border-white/10 rounded-3xl space-y-4">
              <Skeleton className="h-6 w-1/3 rounded-xl" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
