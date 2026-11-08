import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { AdminNav } from "./AdminNav";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-enamel-deep bg-enamel text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="font-display text-lg font-semibold">หลังร้าน</Link>
          <AdminNav />
          <form action={logout} className="ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">ออก</span>
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</div>
    </div>
  );
}
