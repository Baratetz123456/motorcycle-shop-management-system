import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function SalesLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="space-y-1.5">
        <div className="h-8 w-60 bg-zinc-800/50 rounded-xl animate-shimmer" />
        <div className="h-4 w-80 bg-zinc-800/50 rounded animate-shimmer" />
      </div>
      <TableSkeleton columns={7} rows={7} />
    </div>
  );
}
