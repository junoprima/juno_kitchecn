"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-enamel-deep">ครัวแม่ขอพักแป๊บนึง</h1>
      <p className="mt-2 text-ink-2">
        ตอนนี้ระบบเชื่อมต่อไม่ได้ชั่วคราว ลองใหม่อีกครั้งในอีกไม่กี่นาที ถ้าด่วนทักแม่ทางไลน์ได้เลย
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        <RotateCw className="size-4" aria-hidden /> ลองใหม่
      </button>
      {error.digest && <p className="mt-6 text-xs text-ink-3">รหัสอ้างอิง {error.digest}</p>}
    </main>
  );
}
