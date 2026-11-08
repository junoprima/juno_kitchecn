"use client";

import { useActionState, useMemo, useState } from "react";
import { Minus, Plus, ReceiptText, LoaderCircle } from "lucide-react";
import { placeOrder } from "@/lib/actions";
import { baht, formatThaiDate } from "@/lib/dates";
import type { MenuItem } from "@/lib/types";

type Item = MenuItem & { left: number | null };

export function OrderForm({ items, deliveryDate }: { items: Item[]; deliveryDate: string }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState(placeOrder, undefined);

  const lines = useMemo(
    () => items.filter((i) => cart[i.id] > 0).map((i) => ({ ...i, qty: cart[i.id] })),
    [items, cart],
  );
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const setQty = (it: Item, q: number) => {
    const max = Math.min(99, it.left ?? 99);
    setCart((c) => ({ ...c, [it.id]: Math.max(0, Math.min(max, q)) }));
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      {/* เมนู */}
      <section aria-labelledby="menu-h">
        <h2 id="menu-h" className="font-display text-xl font-semibold">เมนูรอบนี้</h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
          {items.map((it) => {
            const qty = cart[it.id] ?? 0;
            const soldOut = it.left === 0;
            return (
              <li key={it.id} className={`flex items-center gap-4 px-4 py-4 sm:px-5 ${qty > 0 ? "bg-enamel-tint/50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium leading-snug ${soldOut ? "text-ink-3 line-through" : ""}`}>{it.name}</p>
                  {it.description && <p className="text-sm text-ink-2">{it.description}</p>}
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="font-display text-base font-semibold text-enamel-deep">{baht(it.price)}</span>
                    {soldOut ? (
                      <span className="font-medium text-chili">หมดแล้ว</span>
                    ) : it.left != null && it.left <= 5 ? (
                      <span className="font-medium text-chili">เหลือ {it.left} ที่</span>
                    ) : it.left != null ? (
                      <span className="text-ink-3">เหลือ {it.left} ที่</span>
                    ) : null}
                  </p>
                </div>
                {!soldOut &&
                  (qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => setQty(it, 1)}
                      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-enamel px-4 font-medium text-enamel transition-colors hover:bg-enamel hover:text-white"
                    >
                      <Plus className="size-4" aria-hidden /> เพิ่ม
                    </button>
                  ) : (
                    <div className="flex items-center rounded-full bg-enamel text-white" role="group" aria-label={`จำนวน ${it.name}`}>
                      <button type="button" onClick={() => setQty(it, qty - 1)} className="grid size-11 place-items-center rounded-full hover:bg-enamel-deep" aria-label="ลด">
                        <Minus className="size-4" />
                      </button>
                      <span className="w-6 text-center font-display text-lg font-semibold" aria-live="polite">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(it, qty + 1)}
                        disabled={it.left != null && qty >= it.left}
                        className="grid size-11 place-items-center rounded-full hover:bg-enamel-deep disabled:opacity-40"
                        aria-label="เพิ่ม"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ใบสั่ง */}
      <form id="slip" action={action} className="slip slip-torn scroll-mt-6 px-5 py-7 lg:sticky lg:top-6">
        <input type="hidden" name="cart" value={JSON.stringify(cart)} />
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">ใบสั่ง</h2>
          <span className="text-sm text-ink-2">ส่ง{formatThaiDate(deliveryDate, "short")}</span>
        </div>
        <div className="rule-dashed mt-3" />

        {lines.length === 0 ? (
          <p className="py-6 text-center text-ink-3">กด “เพิ่ม” ที่เมนูที่อยากได้</p>
        ) : (
          <ul className="space-y-1.5 py-4">
            {lines.map((l) => (
              <li key={l.id} className="flex gap-2 text-[0.95rem]">
                <span className="w-7 shrink-0 font-semibold text-enamel">{l.qty}×</span>
                <span className="min-w-0 flex-1">{l.name}</span>
                <span>{baht(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="rule-dashed" />
        <p className="mt-3 flex items-baseline justify-between">
          <span className="text-ink-2">รวม</span>
          <span className="font-display text-2xl font-semibold text-enamel-deep">{baht(total)}</span>
        </p>

        <div className="mt-5 space-y-3">
          <Field label="ชื่อผู้สั่ง" required>
            <input name="customer_name" required maxLength={60} autoComplete="name" placeholder="เช่น พี่นก ห้อง 302" className="input" />
          </Field>
          <Field label="เบอร์โทร" hint="ไม่บังคับ">
            <input name="phone" type="tel" inputMode="tel" maxLength={20} autoComplete="tel" className="input" />
          </Field>
          <Field label="หมายเหตุถึงแม่" hint="ไม่บังคับ">
            <textarea name="note" rows={2} maxLength={300} placeholder="ไม่เผ็ด, แยกน้ำแกง, จุดรับของ" className="input resize-none" />
          </Field>
        </div>

        {state?.error && (
          <p role="alert" className="mt-4 rounded-lg bg-chili-tint px-3 py-2 text-sm font-medium text-chili">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending || count === 0}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-enamel font-medium text-white shadow-[0_2px_0_var(--enamel-deep)] transition-[background,transform] hover:bg-enamel-deep active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-3/40 disabled:shadow-none"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ReceiptText className="size-5" aria-hidden />}
          {pending ? "กำลังส่งให้แม่…" : "ส่งออเดอร์"}
        </button>
        <p className="mt-2 text-center text-xs text-ink-3">จ่ายเงินตอนรับของ หรือโอนตามที่แม่แจ้ง</p>
      </form>

      {/* แถบล่างบนมือถือ */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <a href="#slip" className="mx-auto flex h-12 max-w-5xl items-center justify-between rounded-xl bg-enamel px-4 font-medium text-white">
            <span>{count} รายการ · {baht(total)}</span>
            <span>ใส่ชื่อแล้วส่ง →</span>
          </a>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm font-medium">
        <span>{label}{required && <span className="text-chili"> *</span>}</span>
        {hint && <span className="text-xs font-normal text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
