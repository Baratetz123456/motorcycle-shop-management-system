import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";

export default function RepairJobDetailLoading() {
  return (
    <div className="p-4 sm:p-6">
      <DetailViewSkeleton hasTable={true} />
    </div>
  );
}
