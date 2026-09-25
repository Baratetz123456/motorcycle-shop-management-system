import InventoryDetailPageClient from "./InventoryDetailPageClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default function Page() {
  return <InventoryDetailPageClient />;
}
