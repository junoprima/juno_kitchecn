import { formatThaiDate, relativeDayLabel } from "@/lib/dates";

/** ตราประทับวันส่ง — หัวใจของหน้า: บอกทันทีว่าสั่งตอนนี้ได้กินวันไหน */
export function DateStamp({ date, size = "lg" }: { date: string; size?: "lg" | "sm" }) {
  const rel = relativeDayLabel(date);
  return (
    <div
      className={`stamp inline-flex flex-col items-start rounded-xl bg-marigold text-marigold-ink shadow-[0_1px_2px_rgb(61_42_0/0.2),0_6px_16px_-6px_rgb(61_42_0/0.4)] ${
        size === "lg" ? "px-4 py-2.5" : "px-3 py-1.5"
      }`}
    >
      <span className={`font-medium ${size === "lg" ? "text-sm" : "text-xs"}`}>ส่ง{rel ? ` ${rel}` : ""}</span>
      <span className={`font-display font-semibold leading-tight ${size === "lg" ? "text-2xl" : "text-base"}`}>
        {formatThaiDate(date)}
      </span>
    </div>
  );
}
