import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/queries";
import { baht } from "@/lib/dates";
import { DateStamp } from "@/components/DateStamp";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-enamel-deep">
        {order.status === "cancelled" ? "ออเดอร์นี้ถูกยกเลิก" : `ขอบคุณค่ะ คุณ${order.customer_name}`}
      </h1>
      <p className="mt-1 text-ink-2">แม่ได้รับออเดอร์แล้ว บันทึกลิงก์หรือ<wbr />แคปหน้าจอนี้ไว้ดูสถานะได้</p>

      <section className="slip slip-torn mt-8 px-5 py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-2">เลขออเดอร์</p>
            <p className="font-display text-4xl font-semibold tracking-wider">{order.code}</p>
          </div>
          <DateStamp date={order.delivery_date} size="sm" />
        </div>
        <div className="mt-3">
          <StatusBadge status={order.status} />
        </div>
        <div className="rule-dashed mt-5" />
        <ul className="space-y-1.5 py-4">
          {order.items.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-7 shrink-0 font-semibold text-enamel">{l.qty}×</span>
              <span className="min-w-0 flex-1">{l.name}</span>
              <span>{baht(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="rule-dashed" />
        <p className="mt-3 flex items-baseline justify-between">
          <span className="text-ink-2">รวม</span>
          <span className="font-display text-2xl font-semibold text-enamel-deep">{baht(order.total)}</span>
        </p>
        {(order.note || order.phone) && (
          <dl className="mt-4 space-y-1 text-sm text-ink-2">
            {order.phone && <div><dt className="inline font-medium">โทร </dt><dd className="inline">{order.phone}</dd></div>}
            {order.note && <div><dt className="inline font-medium">หมายเหตุ </dt><dd className="inline">{order.note}</dd></div>}
          </dl>
        )}
      </section>

      <Link href="/" className="mt-8 inline-block font-medium text-enamel underline">สั่งเพิ่มอีก</Link>
    </main>
  );
}
