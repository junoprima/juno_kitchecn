import Link from "next/link";
import { getOrderDates, getOrdersForDate, getSettings } from "@/lib/queries";
import { addDays, baht, bangkokNow, deliveryDateFor, formatThaiDate, relativeDayLabel } from "@/lib/dates";
import { OrderCard } from "./OrderCard";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const settings = await getSettings();
  const today = bangkokNow().date;
  const next = deliveryDateFor(settings.cutoff_time).date;
  const q = (await searchParams).date;
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : addDays(today, 1);

  const [orders, dates] = await Promise.all([getOrdersForDate(date), getOrderDates()]);
  const live = orders.filter((o) => o.status !== "cancelled");

  // รายการที่ต้องทำ: รวมจำนวนต่อเมนู
  const prep = new Map<string, number>();
  for (const o of live) for (const l of o.items) prep.set(l.name, (prep.get(l.name) ?? 0) + l.qty);
  const prepList = [...prep.entries()].sort((a, b) => b[1] - a[1]);
  const revenue = live.reduce((s, o) => s + o.total, 0);

  const chips = Array.from(new Set([today, addDays(today, 1), next, ...dates.map((d) => d.d)])).sort().reverse();

  return (
    <>
      <nav aria-label="เลือกวันส่ง" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {chips.map((d) => {
          const rel = relativeDayLabel(d);
          const active = d === date;
          return (
            <Link
              key={d}
              href={`/admin?date=${d}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                active ? "border-enamel bg-enamel font-medium text-white" : "border-line bg-surface text-ink-2 hover:border-ink-3"
              }`}
            >
              {rel ? `${rel} · ` : ""}{formatThaiDate(d, "short")}
            </Link>
          );
        })}
      </nav>

      <h1 className="mt-6 font-display text-2xl font-semibold">
        ส่ง{relativeDayLabel(date) ?? ""} {formatThaiDate(date)}
      </h1>
      <p className="text-ink-2">
        {live.length} ออเดอร์ · ยอดรวม <span className="font-semibold text-ink">{baht(revenue)}</span>
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr] lg:items-start">
        <section aria-labelledby="prep-h" className="slip slip-torn px-5 py-6 lg:sticky lg:top-20">
          <h2 id="prep-h" className="font-display text-lg font-semibold">ต้องทำ</h2>
          <div className="rule-dashed mt-2" />
          {prepList.length === 0 ? (
            <p className="py-4 text-ink-3">ยังไม่มีออเดอร์</p>
          ) : (
            <ul className="space-y-1 pt-3">
              {prepList.map(([name, qty]) => (
                <li key={name} className="flex gap-3">
                  <span className="w-8 shrink-0 text-right font-display text-lg font-semibold text-enamel">{qty}</span>
                  <span className="pt-0.5">{name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="รายการออเดอร์">
          {orders.length === 0 ? (
            <p className="rounded-2xl bg-surface p-6 text-ink-2 shadow-sm">
              ยังไม่มีใครสั่งสำหรับวันนี้ ส่งลิงก์หน้าร้านให้ลูกค้าในไลน์ได้เลย
            </p>
          ) : (
            <ol className="space-y-3">
              {orders.map((o, i) => (
                <OrderCard key={o.id} order={o} index={i + 1} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
