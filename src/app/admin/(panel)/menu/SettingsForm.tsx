"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions";
import type { ShopSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  return (
    <form action={action} className="mt-3 space-y-4 rounded-2xl bg-surface p-5 shadow-sm">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-medium">เปิดรับออเดอร์</span>
          <span className="text-sm text-ink-2">ปิดไว้ช่วงที่แม่หยุด</span>
        </span>
        <input type="checkbox" name="accepting_orders" defaultChecked={settings.accepting_orders} className="toggle" />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">ปิดรับของพรุ่งนี้เวลา</span>
        <input type="time" name="cutoff_time" defaultValue={settings.cutoff_time} required className="input" />
        <span className="mt-1 block text-sm text-ink-2">สั่งหลังเวลานี้ จะไปส่งวันมะรืน</span>
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">ประกาศบนหน้าร้าน</span>
        <textarea name="notice" rows={3} maxLength={200} defaultValue={settings.notice} placeholder="เช่น ส่งรอบ 11 โมง หน้าหมู่บ้าน / โอนพร้อมเพย์ 08x-xxx-xxxx" className="input resize-none" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-chili">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">{pending ? "กำลังบันทึก…" : "บันทึก"}</button>
        {state?.ok && !pending && <span key={state.ok} className="text-sm text-enamel" role="status">บันทึกแล้ว</span>}
      </div>
    </form>
  );
}
