import Link from "next/link";
import { getDeliveryDays, getMenu, getOrderDates } from "@/lib/queries";
import { addDays, bangkokNow, formatThaiDate, relativeDayLabel } from "@/lib/dates";
import { DayEditor } from "./DayEditor";

export default async function DaysPage() {
  const today = bangkokNow().date;
  const minDate = addDays(today, 1);
  const [days, menu, orderDates] = await Promise.all([getDeliveryDays(minDate), getMenu(), getOrderDates()]);
  const counts = new Map(orderDates.map((d) => [d.d, d.n]));

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold">รอบส่งพิเศษ</h1>
      <p className="max-w-prose text-ink-2">
        เปิดรับออเดอร์ล่วงหน้าสำหรับวันที่ต้องการ พร้อมเลือกเมนูเฉพาะของวันนั้น ลูกค้าจะเห็นวันนี้ในปุ่มเลือกวันส่งที่หน้าร้าน
        และสั่งได้จนถึงเวลาปิดรับของคืนก่อนวันส่ง ส่วนรอบปกติ (ส่งพรุ่งนี้ ใช้เมนูที่ “ขายอยู่”) ยังเปิดตามเดิม
      </p>

      <section aria-labelledby="new-h" className="mt-6 rounded-2xl bg-surface p-5 shadow-sm">
        <h2 id="new-h" className="mb-4 font-display text-lg font-semibold">เปิดรอบใหม่</h2>
        <DayEditor menu={menu} minDate={minDate} />
      </section>

      <h2 className="mt-10 font-display text-lg font-semibold">รอบที่เปิดอยู่</h2>
      {days.length === 0 ? (
        <p className="mt-2 text-ink-2">ยังไม่มีรอบพิเศษ</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {days.map((d) => {
            const rel = relativeDayLabel(d.date);
            const n = counts.get(d.date) ?? 0;
            return (
              <li key={d.date} className="rounded-2xl bg-surface p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    {rel ? `${rel} · ` : ""}{formatThaiDate(d.date)}
                  </h3>
                  <Link href={`/admin?date=${d.date}`} className="text-sm font-medium text-enamel underline">
                    {n} ออเดอร์
                  </Link>
                </div>
                <DayEditor key={d.date + JSON.stringify(d.items)} menu={menu} day={d} minDate={minDate} orderCount={n} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
