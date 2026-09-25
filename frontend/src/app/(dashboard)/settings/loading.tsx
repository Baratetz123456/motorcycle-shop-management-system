import { Skeleton } from "@/components/ui/Skeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function SettingsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-60 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      <TableSkeleton columns={4} rows={6} />
    </div>
  );
}
