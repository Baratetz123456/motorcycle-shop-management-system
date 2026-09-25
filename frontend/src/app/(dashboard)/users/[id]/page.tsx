import UserDetailPageClient from "./UserDetailPageClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default function Page() {
  return <UserDetailPageClient />;
}
