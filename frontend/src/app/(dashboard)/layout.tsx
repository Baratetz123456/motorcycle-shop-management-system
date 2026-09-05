import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col min-w-0 w-full">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
