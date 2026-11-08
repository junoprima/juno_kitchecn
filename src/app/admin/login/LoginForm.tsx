"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">รหัสผ่าน</span>
        <input name="password" type="password" required autoFocus autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-chili">{state.error}</p>}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-enamel font-medium text-white hover:bg-enamel-deep disabled:opacity-60">
        {pending ? "กำลังเข้า…" : "เข้าสู่หลังร้าน"}
      </button>
    </form>
  );
}
