"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wide transition-colors"
      style={{
        border: "1.5px solid rgba(201,59,59,0.3)",
        color: "var(--color-error)",
        fontFamily: "var(--font-heading)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(201,59,59,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
    >
      <LogOut size={16} />
      Sign Out
    </button>
  );
}
