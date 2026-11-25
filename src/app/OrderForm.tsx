"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronUp, Minus, Plus, ReceiptText, LoaderCircle } from "lucide-react";
import { placeOrder } from "@/lib/actions";
import { baht, formatThaiDate } from "@/lib/dates";
import { emptyPicks, optionText, resolvePicks, type Picks } from "@/lib/options";
import type { MenuItem } from "@/lib/types";

type Item = MenuItem & { left: number | null };
type Line = { key: string; id: string; picks: Picks; qty: number };

const lineKey = (id: string, picks: Picks) => `${id}|${JSON.stringify(picks)}`;

export function OrderForm({ items, deliveryDate }: { items: Item[]; deliveryDate: string }) {
  const [cart, setCart] = useState<Line[]>([]);
  const [open, setOpen] = useState<string | null>(null); // เมนูที่กำลังเลือกตัวเลือก
  const [state, action, pending] = useActionState(placeOrder, undefined);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const qtyOf = (id: string) => cart.reduce((s, l) => (l.id === id ? s + l.qty : s), 0);
  const maxOf = (it: Item) => Math.min(99, it.left ?? 99);

  const lines = cart.flatMap((l) => {
    const it = byId.get(l.id);
    if (!it) return [];
    const r = resolvePicks(it.options, l.picks);
    if ("error" in r) return [];
    return [{ ...l, item: it, unit: it.price + r.extra, label: optionText(r.chosen, it.options) }];
  });
  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  /** เพิ่ม/ลดจำนวนของบรรทัด (สร้างใหม่ถ้ายังไม่มี) โดยไม่ให้เกินจำนวนที่เหลือ */
  const bump = (id: string, picks: Picks, delta: number) =>
    setCart((c) => {
      const it = byId.get(id);
      if (!it) return c;
      const key = lineKey(id, picks);
      const room = maxOf(it) - c.reduce((s, l) => (l.id === id ? s + l.qty : s), 0);
      const d = Math.min(delta, room);
      const hit = c.find((l) => l.key === key);
      if (!hit) return d > 0 ? [...c, { key, id, picks, qty: d }] : c;
      return c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0);
    });

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      {/* เมนู */}
      <section aria-labelledby="menu-h">
        <h2 id="menu-h" className="font-display text-xl font-semibold">เมนูส่ง{formatThaiDate(deliveryDate, "short")}</h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
          {items.map((it) => {
            const qty = qtyOf(it.id);
            const soldOut = it.left === 0;
            const full = qty >= maxOf(it);
            const hasOptions = it.options.length > 0;
            const isOpen = open === it.id;
            const plain = lineKey(it.id, []);
            return (
              <li key={it.id} className={qty > 0 ? "bg-enamel-tint/50" : ""}>
                <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
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
                      {hasOptions && qty > 0 && <span className="font-medium text-enamel">ในใบสั่ง {qty}</span>}
                    </p>
                  </div>
                  {!soldOut &&
                    (hasOptions ? (
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : it.id)}
                        disabled={full && !isOpen}
                        aria-expanded={isOpen}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-enamel px-4 font-medium text-enamel transition-colors hover:bg-enamel hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-enamel"
                      >
                        {isOpen ? <ChevronUp className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                        {isOpen ? "ปิด" : "เพิ่ม"}
                      </button>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => bump(it.id, [], 1)}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-enamel px-4 font-medium text-enamel transition-colors hover:bg-enamel hover:text-white"
                      >
                        <Plus className="size-4" aria-hidden /> เพิ่ม
                      </button>
                    ) : (
                      <Stepper
                        label={it.name}
                        qty={cart.find((l) => l.key === plain)?.qty ?? 0}
                        onMinus={() => bump(it.id, [], -1)}
                        onPlus={() => bump(it.id, [], 1)}
                        plusDisabled={full}
                      />
                    ))}
                </div>
                {hasOptions && isOpen && !soldOut && (
                  <OptionPicker
                    item={it}
                    full={full}
                    onAdd={(picks) => {
                      bump(it.id, picks, 1);
                      setOpen(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ใบสั่ง */}
      <form id="slip" action={action} className="slip slip-torn scroll-mt-6 px-5 py-7 lg:sticky lg:top-6">
        <input type="hidden" name="cart" value={JSON.stringify(cart.map(({ id, qty, picks }) => ({ id, qty, picks })))} />
        <input type="hidden" name="delivery_date" value={deliveryDate} />
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">ใบสั่ง</h2>
          <span className="text-sm text-ink-2">ส่ง{formatThaiDate(deliveryDate, "short")}</span>
        </div>
        <div className="rule-dashed mt-3" />

        {lines.length === 0 ? (
          <p className="py-6 text-center text-ink-3">กด “เพิ่ม” ที่เมนูที่อยากได้</p>
        ) : (
          <ul className="space-y-2.5 py-4">
            {lines.map((l) => (
              <li key={l.key} className="flex items-start gap-2 text-[0.95rem]">
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{l.item.name}</p>
                  {l.label && <p className="text-sm leading-snug text-ink-2">{l.label}</p>}
                  <div className="mt-1 flex items-center gap-1" role="group" aria-label={`จำนวน ${l.item.name}`}>
                    <button type="button" onClick={() => bump(l.id, l.picks, -1)} className="grid size-8 place-items-center rounded-full border border-line hover:border-enamel" aria-label="ลด">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center font-semibold text-enamel" aria-live="polite">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => bump(l.id, l.picks, 1)}
                      disabled={qtyOf(l.id) >= maxOf(l.item)}
                      className="grid size-8 place-items-center rounded-full border border-line hover:border-enamel disabled:opacity-40"
                      aria-label="เพิ่ม"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
                <span className="shrink-0">{baht(l.unit * l.qty)}</span>
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
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-enamel font-medium text-white shadow-[0_1px_2px_rgb(21_33_27/0.12),0_6px_14px_-6px_rgb(20_74_54/0.55)] transition-[background,transform] hover:bg-enamel-deep active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-3/40 disabled:shadow-none"
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
            <span className="inline-flex items-center gap-1.5">ใส่ชื่อแล้วส่ง <ArrowRight className="size-4" aria-hidden /></span>
          </a>
        </div>
      )}
    </div>
  );
}

function OptionPicker({ item, full, onAdd }: { item: Item; full: boolean; onAdd: (picks: Picks) => void }) {
  const [picks, setPicks] = useState<Picks>(() => emptyPicks(item.options));
  const r = resolvePicks(item.options, picks);
  const unit = item.price + ("error" in r ? 0 : r.extra);

  const choose = (gi: number, ci: number, single: boolean) =>
    setPicks((p) =>
      p.map((sel, i) => {
        if (i !== gi) return sel;
        if (single) return sel[0] === ci && !item.options[gi].required ? [] : [ci];
        return sel.includes(ci) ? sel.filter((x) => x !== ci) : [...sel, ci].sort((a, b) => a - b);
      }),
    );

  return (
    <div className="space-y-4 border-t border-dashed border-line px-4 pb-4 pt-3 sm:px-5">
      {item.options.map((g, gi) => {
        const single = g.type === "single";
        return (
          <fieldset key={gi}>
            <legend className="mb-2 text-sm">
              <span className="font-medium">{g.name}</span>
              <span className="text-ink-3"> · {single ? (g.required ? "เลือก 1 อย่าง" : "เลือกได้ 1 อย่าง ไม่บังคับ") : "เลือกได้หลายอย่าง"}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {g.choices.map((c, ci) => {
                const on = picks[gi]?.includes(ci);
                return (
                  <button
                    key={ci}
                    type="button"
                    role={single ? "radio" : "checkbox"}
                    aria-checked={on}
                    onClick={() => choose(gi, ci, single)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
                      on ? "border-enamel bg-enamel text-white" : "border-line bg-surface hover:border-enamel"
                    }`}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                    {c.name}
                    {c.price > 0 && <span className={on ? "text-white/80" : "text-ink-3"}>+{baht(c.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <button type="button" disabled={"error" in r || full} onClick={() => onAdd(picks)} className="btn-primary w-full sm:w-auto">
        <Plus className="size-4" aria-hidden /> ใส่ใบสั่ง · {baht(unit)}
      </button>
    </div>
  );
}

function Stepper({ label, qty, onMinus, onPlus, plusDisabled }: { label: string; qty: number; onMinus: () => void; onPlus: () => void; plusDisabled: boolean }) {
  return (
    <div className="flex shrink-0 items-center rounded-full bg-enamel text-white" role="group" aria-label={`จำนวน ${label}`}>
      <button type="button" onClick={onMinus} className="grid size-11 place-items-center rounded-full hover:bg-enamel-deep" aria-label="ลด">
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display text-lg font-semibold" aria-live="polite">{qty}</span>
      <button type="button" onClick={onPlus} disabled={plusDisabled} className="grid size-11 place-items-center rounded-full hover:bg-enamel-deep disabled:opacity-40" aria-label="เพิ่ม">
        <Plus className="size-4" />
      </button>
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
