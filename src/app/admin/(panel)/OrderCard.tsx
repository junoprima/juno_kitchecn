"use client";

import { useTransition } from "react";
import { setOrderStatus } from "@/lib/actions";
import { baht } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order, OrderStatus } from "@/lib/types";
import { Phone } from "lucide-react";

const NEXT: Record<OrderStatus, { to: OrderStatus; label: string } | null> = {
  new: { to: "confirmed", label: "รับออเดอร์" },
  confirmed: { to: "done", label: "ส่งแล้ว" },
  done: null,
  cancelled: null,
};

export function OrderCard({ order: o, index }: { order: Order; index: number }) {
  const [pending, start] = useTransition();
  const go = (s: OrderStatus) => start(() => setOrderStatus(o.id, s));
  const next = NEXT[o.status];
  const time = new Date(o.created_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

  return (
    <li className={`rounded-2xl bg-surface p-4 shadow-sm sm:p-5 ${o.status === "cancelled" ? "opacity-60" : ""} ${pending ? "animate-pulse" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-sm text-ink-3">#{index} · {o.code} · สั่ง {time} น.</p>
          <p className="font-display text-lg font-semibold">{o.customer_name}</p>
          {o.phone && (
            <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 text-sm text-enamel underline">
              <Phone className="size-3.5" aria-hidden /> {o.phone}
            </a>
          )}
        </div>
        <StatusBadge status={o.status} />
      </div>

      <ul className="mt-3 space-y-0.5">
        {o.items.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-7 shrink-0 font-semibold text-enamel">{l.qty}×</span>
            <span className="flex-1">{l.name}</span>
            <span className="text-ink-2">{baht(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-2 rounded-lg bg-marigold/20 px-3 py-1.5 text-sm">“{o.note}”</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="mr-auto font-display text-lg font-semibold">{baht(o.total)}</span>
        {o.status === "cancelled" ? (
          <button onClick={() => go("new")} disabled={pending} className="btn-ghost">คืนออเดอร์</button>
        ) : (
          <>
            {o.status !== "done" && (
              <button
                onClick={() => confirm(`ยกเลิกออเดอร์ของ ${o.customer_name}?`) && go("cancelled")}
                disabled={pending}
                className="btn-ghost text-chili"
              >
                ยกเลิก
              </button>
            )}
            {next && (
              <button onClick={() => go(next.to)} disabled={pending} className="btn-primary">
                {next.label}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
