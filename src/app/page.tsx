import { getBookedQty, getMenu, getSettings } from "@/lib/queries";
import { deliveryDateFor } from "@/lib/dates";
import { DateStamp } from "@/components/DateStamp";
import { OrderForm } from "./OrderForm";
import { Clock, Moon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSettings();
  const { date, beforeCutoff } = deliveryDateFor(settings.cutoff_time);
  const [menu, booked] = await Promise.all([getMenu({ onlyAvailable: true }), getBookedQty(date)]);

  const items = menu.map((m) => ({
    ...m,
    left: m.daily_limit == null ? null : Math.max(0, m.daily_limit - (booked.get(m.id) ?? 0)),
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-enamel-deep sm:text-5xl">ครัวแม่</h1>
          <p className="mt-1 text-ink-2">สั่งล่วงหน้า แม่ทำสดๆ ส่งวันถัดไป</p>
        </div>
        {settings.accepting_orders && <DateStamp date={date} />}
      </header>

      {settings.accepting_orders ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-2">
          <Clock className="size-4 shrink-0 text-enamel" aria-hidden />
          {beforeCutoff
            ? `รับออเดอร์รอบนี้ถึง ${settings.cutoff_time} น. คืนนี้`
            : `เลย ${settings.cutoff_time} น. แล้ว ออเดอร์ตอนนี้จะไปส่งรอบถัดไป`}
        </p>
      ) : null}

      {settings.notice && (
        <p className="mt-4 max-w-prose rounded-xl bg-enamel-tint px-4 py-3 text-enamel-deep">{settings.notice}</p>
      )}

      {!settings.accepting_orders ? (
        <section className="mt-10 flex max-w-md flex-col items-start gap-3 rounded-2xl bg-surface p-6 shadow-sm">
          <Moon className="size-7 text-enamel" aria-hidden />
          <h2 className="font-display text-xl font-semibold">วันนี้แม่ปิดรับออเดอร์</h2>
          <p className="text-ink-2">ไว้แวะมาใหม่นะ ถ้าด่วนทักแม่ทางไลน์ได้เลย</p>
        </section>
      ) : items.length === 0 ? (
        <section className="mt-10 max-w-md rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">ยังไม่มีเมนูรอบนี้</h2>
          <p className="mt-1 text-ink-2">แม่กำลังคิดเมนูอยู่ แวะมาดูใหม่อีกทีนะ</p>
        </section>
      ) : (
        <OrderForm items={items} deliveryDate={date} />
      )}
    </main>
  );
}
