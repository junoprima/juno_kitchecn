import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-semibold text-enamel-deep">ครัวแม่ · หลังร้าน</h1>
      <p className="mt-1 text-ink-2">ใส่รหัสเพื่อดูออเดอร์และแก้เมนู</p>
      <LoginForm />
    </main>
  );
}
