"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDeliveryDay, saveDeliveryDay } from "@/lib/actions";
import { baht } from "@/lib/dates";
import type { MenuItem } from "@/lib/types";
import type { DeliveryDay } from "@/lib/queries";

type Props = { menu: MenuItem[]; day?: DeliveryDay; minDate: string; orderCount?: number };

export function DayEditor({ menu, day, minDate, orderCount = 0 }: Props) {
  const [state, action, pending] = useActionState(saveDeliveryDay, undefined);
  const [deleting, startDelete] = useTransition();
  const [, startSave] = useTransition();
  const picked = new Map(day?.items.map((i) => [i.menu_item_id, i.daily_limit]) ?? []);
  const [checked, setChecked] = useState<Set<string>>(new Set(picked.keys()));

  // ฟอร์ม “เปิดรอบใหม่”: ล้างค่าหลังบันทึกสำเร็จ
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!day && state?.ok) {
      formRef.current?.reset();
      setChecked(new Set());
    }
  }, [day, state?.ok]);

  const toggle = (id: string, on: boolean) =>
    setChecked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <form
      ref={formRef}
      // ส่งเองแทน action={...} เพื่อไม่ให้ React ล้างค่าที่กรอกไว้เมื่อบันทึกไม่ผ่าน
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startSave(() => action(data));
      }}
      className="space-y-4"
    >
      {day ? (
        <input type="hidden" name="date" value={day.date} />
      ) : (
        <label className="block max-w-xs">
          <span className="mb-1 block font-medium">วันส่ง</span>
          <input type="date" name="date" min={minDate} required className="input" />
        </label>
      )}

      <fieldset>
        <legend className="mb-1 font-medium">เมนูของวันนี้</legend>
        <p className="mb-2 text-sm text-ink-2">
          ติ๊กเมนูที่จะขาย เลือกเมนูที่ปิดขายรายวันไว้ได้ด้วย · ช่อง “จำกัด” เว้นว่างได้ ถ้าใช้จำนวนเดิมของเมนู
        </p>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {menu.map((m) => {
            const on = checked.has(m.id);
            return (
              <li key={m.id} className={`flex items-center gap-3 px-3 py-2.5 ${on ? "bg-enamel-tint/40" : ""}`}>
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="item"
                    value={m.id}
                    checked={on}
                    onChange={(e) => toggle(m.id, e.target.checked)}
                    className="size-5 shrink-0 accent-enamel"
                  />
                  <span className="min-w-0">
                    <span className="block leading-snug">{m.name}</span>
                    <span className="text-sm text-ink-2">
                      {baht(m.price)}
                      {!m.is_available && <span className="text-ink-3"> · ปิดขายรายวัน</span>}
                    </span>
                  </span>
                </label>
                <label className={`flex shrink-0 items-center gap-1.5 text-sm ${on ? "" : "invisible"}`}>
                  <span className="text-ink-2">จำกัด</span>
                  <input
                    type="number"
                    name={`limit_${m.id}`}
                    min={1}
                    inputMode="numeric"
                    defaultValue={picked.get(m.id) ?? ""}
                    placeholder={m.daily_limit ? String(m.daily_limit) : "ไม่จำกัด"}
                    disabled={!on}
                    className="input w-24 py-1.5 text-sm"
                    aria-label={`จำกัดจำนวน ${m.name}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-medium">ข้อความถึงลูกค้าสำหรับวันนี้</span>
        <input
          name="note"
          maxLength={200}
          defaultValue={day?.note ?? ""}
          placeholder="เช่น เมนูพิเศษวันลอยกระทง ส่งก่อน 11 โมง"
          className="input"
        />
      </label>

      {state?.error && <p role="alert" className="text-sm font-medium text-chili">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "กำลังบันทึก…" : day ? "บันทึก" : "เปิดรอบนี้"}
        </button>
        {state?.ok && !pending && (
          <span key={state.ok} className="text-sm text-enamel" role="status">{day ? "บันทึกแล้ว" : "เปิดรอบแล้ว ดูในรายการด้านล่าง"}</span>
        )}
        {day && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              const msg = orderCount
                ? `วันนี้มี ${orderCount} ออเดอร์แล้ว ปิดรอบแล้วออเดอร์เดิมยังอยู่ แต่ลูกค้าจะสั่งเพิ่มไม่ได้ ปิดเลยไหม?`
                : "ปิดรอบนี้? ลูกค้าจะเลือกวันนี้ไม่ได้อีก";
              if (confirm(msg)) startDelete(() => deleteDeliveryDay(day.date));
            }}
            className="btn-ghost ml-auto text-chili hover:bg-chili-tint"
          >
            <Trash2 className="size-4" aria-hidden /> {deleting ? "กำลังปิด…" : "ปิดรอบนี้"}
          </button>
        )}
      </div>
    </form>
  );
}
