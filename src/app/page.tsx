import Link from "next/link";
import { getMenuForDate, getOpenRounds, getSettings } from "@/lib/queries";
import { deliveryDateFor, formatThaiDate, relativeDayLabel } from "@/lib/dates";
import { DateStamp } from "@/components/DateStamp";
import { OrderForm } from "./OrderForm";
import { CalendarDays, Clock, Moon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const settings = await getSettings();
  const { beforeCutoff } = deliveryDateFor(settings.cutoff_time);
  const rounds = await getOpenRounds(settings);
  const q = (await searchParams).date;
  const round = rounds.find((r) => r.date === q) ?? rounds[0];
  const items = round ? await getMenuForDate(round.date) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-enamel-deep sm:text-5xl">ครัวแม่</h1>
          <p className="mt-1 text-ink-2">สั่งล่วงหน้า แม่ทำสดๆ ส่งตามวันที่เลือก</p>
        </div>
        {round && <DateStamp key={round.date} date={round.date} />}
      </header>

      {round && !round.special ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-2">
          <Clock className="size-4 shrink-0 text-enamel" aria-hidden />
          {beforeCutoff
            ? `รับออเดอร์รอบนี้ถึง ${settings.cutoff_time} น. คืนนี้`
            : `เลย ${settings.cutoff_time} น. แล้ว ออเดอร์ตอนนี้จะไปส่งรอบถัดไป`}
        </p>
      ) : round ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-2">
          <CalendarDays className="size-4 shrink-0 text-enamel" aria-hidden />
          รอบพิเศษ รับออเดอร์ถึง {settings.cutoff_time} น. ของคืนก่อนวันส่ง
        </p>
      ) : null}

      {settings.notice && (
        <p className="mt-4 max-w-prose rounded-xl bg-enamel-tint px-4 py-3 text-enamel-deep">{settings.notice}</p>
      )}

      {rounds.length > 1 && (
        <nav aria-label="เลือกวันส่ง" className="mt-6">
          <h2 className="text-sm font-medium text-ink-2">เลือกวันส่ง</h2>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {rounds.map((r) => {
              const active = r.date === round?.date;
              const rel = relativeDayLabel(r.date);
              return (
                <Link
                  key={r.date}
                  href={`/?date=${r.date}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 flex-col justify-center rounded-xl border px-3.5 py-1.5 leading-tight transition-colors ${
                    active
                      ? "border-enamel bg-enamel text-white"
                      : "border-line bg-surface text-ink hover:border-enamel"
                  }`}
                >
                  <span className="font-medium">{rel ? `${rel} · ` : ""}{formatThaiDate(r.date, "short")}</span>
                  {r.special && (
                    <span className={`text-xs ${active ? "text-white/80" : "text-enamel"}`}>รอบพิเศษ</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {round?.note && (
        <p className="mt-4 max-w-prose rounded-xl bg-marigold/25 px-4 py-3 text-marigold-ink">{round.note}</p>
      )}

      {!round ? (
        <section className="mt-10 flex max-w-md flex-col items-start gap-3 rounded-2xl bg-surface p-6 shadow-sm">
          <Moon className="size-7 text-enamel" aria-hidden />
          <h2 className="font-display text-xl font-semibold">ตอนนี้แม่ปิดรับออเดอร์</h2>
          <p className="text-ink-2">ไว้แวะมาใหม่นะ ถ้าด่วนทักแม่ทางไลน์ได้เลย</p>
        </section>
      ) : items.length === 0 ? (
        <section className="mt-10 max-w-md rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">ยังไม่มีเมนูรอบนี้</h2>
          <p className="mt-1 text-ink-2">แม่กำลังคิดเมนูอยู่ แวะมาดูใหม่อีกทีนะ</p>
        </section>
      ) : (
        <OrderForm key={round.date} items={items} deliveryDate={round.date} />
      )}
    </main>
  );
}
