"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserManagementPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=users");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-mono">Redirecting to Settings &gt; Staff & Users...</span>
    </div>
  );
}
