import { redirect } from "next/navigation";

export default function UserManagementPage() {
  redirect("/settings?tab=users");
}

