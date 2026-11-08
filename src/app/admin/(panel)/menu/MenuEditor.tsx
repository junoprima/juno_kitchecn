"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { createMenuItem, deleteMenuItem, moveMenuItem, toggleMenuItem, updateMenuItem, type FormState } from "@/lib/actions";
import { baht } from "@/lib/dates";
import type { MenuItem } from "@/lib/types";

export function MenuEditor({ items }: { items: MenuItem[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(items.length === 0);

  return (
    <div className="mt-4">
      {items.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
          {items.map((it, i) =>
            editing === it.id ? (
              <li key={it.id} className="bg-enamel-tint/40 p-4">
                <ItemForm item={it} action={updateMenuItem} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <Row key={it.id} item={it} first={i === 0} last={i === items.length - 1} onEdit={() => setEditing(it.id)} />
            ),
          )}
        </ul>
      )}

      {adding ? (
        <div className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-semibold">เมนูใหม่</h2>
          <ItemForm action={createMenuItem} onDone={() => setAdding(false)} keepOpen />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-primary mt-4">
          <Plus className="size-4" aria-hidden /> เพิ่มเมนู
        </button>
      )}
    </div>
  );
}

function Row({ item: it, first, last, onEdit }: { item: MenuItem; first: boolean; last: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col">
        <button disabled={first || pending} onClick={() => start(() => moveMenuItem(it.id, -1))} className="icon-btn" aria-label={`เลื่อน ${it.name} ขึ้น`}>
          <ArrowUp className="size-4" />
        </button>
        <button disabled={last || pending} onClick={() => start(() => moveMenuItem(it.id, 1))} className="icon-btn" aria-label={`เลื่อน ${it.name} ลง`}>
          <ArrowDown className="size-4" />
        </button>
      </div>
      <div className={`min-w-0 flex-1 ${it.is_available ? "" : "text-ink-3"}`}>
        <p className="font-medium">{it.name}</p>
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-enamel-deep">{baht(it.price)}</span>
          {it.daily_limit != null && <> · วันละ {it.daily_limit} ที่</>}
          {it.description && <> · {it.description}</>}
        </p>
      </div>
      <label className="flex shrink-0 items-center gap-2 text-sm text-ink-2">
        <span className="hidden sm:inline">{it.is_available ? "ขายอยู่" : "ปิดไว้"}</span>
        <input
          type="checkbox"
          className="toggle"
          checked={it.is_available}
          disabled={pending}
          onChange={(e) => start(() => toggleMenuItem(it.id, e.target.checked))}
          aria-label={`เปิดขาย ${it.name}`}
        />
      </label>
      <button onClick={onEdit} className="icon-btn" aria-label={`แก้ ${it.name}`}><Pencil className="size-4" /></button>
      <button
        onClick={() => confirm(`ลบ "${it.name}" ถาวร? (ออเดอร์เก่ายังเก็บชื่อไว้)`) && start(() => deleteMenuItem(it.id))}
        disabled={pending}
        className="icon-btn hover:text-chili"
        aria-label={`ลบ ${it.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function ItemForm({
  item,
  action,
  onDone,
  keepOpen,
}: {
  item?: MenuItem;
  action: (s: FormState, f: FormData) => Promise<FormState>;
  onDone: () => void;
  keepOpen?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state?.ok || handled.current === state.ok) return;
    handled.current = state.ok;
    if (keepOpen) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
    } else onDone();
  }, [state, keepOpen, onDone]);

  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="block sm:col-span-1">
        <span className="mb-1 block text-sm font-medium">ชื่อเมนู</span>
        <input name="name" required maxLength={80} defaultValue={item?.name} autoFocus className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">ราคา (บาท)</span>
        <input name="price" type="number" inputMode="numeric" min={0} required defaultValue={item?.price} className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">จำกัด/วัน</span>
        <input name="daily_limit" type="number" inputMode="numeric" min={1} defaultValue={item?.daily_limit ?? ""} placeholder="ไม่จำกัด" className="input" />
      </label>
      <label className="block sm:col-span-3">
        <span className="mb-1 block text-sm font-medium">รายละเอียด <span className="font-normal text-ink-3">ไม่บังคับ</span></span>
        <input name="description" maxLength={160} defaultValue={item?.description} placeholder="เช่น เผ็ดกลาง, กล่องละ 6 ชิ้น" className="input" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-chili sm:col-span-3">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-3">
        <button disabled={pending} className="btn-primary">{pending ? "กำลังบันทึก…" : item ? "บันทึก" : "เพิ่มเมนู"}</button>
        <button type="button" onClick={onDone} className="btn-ghost">{keepOpen ? "ปิด" : "ยกเลิก"}</button>
      </div>
    </form>
  );
}
