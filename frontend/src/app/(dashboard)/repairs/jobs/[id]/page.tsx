import JobDetailPageClient from "./JobDetailPageClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default function Page() {
  return <JobDetailPageClient />;
}
