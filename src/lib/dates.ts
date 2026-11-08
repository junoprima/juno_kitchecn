const TZ = "Asia/Bangkok";

/** วันที่ (YYYY-MM-DD) และเวลา (HH:MM) ปัจจุบันตามเวลาไทย */
export function bangkokNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** สั่งก่อนเวลาปิดรับ → ส่งพรุ่งนี้ / หลังเวลาปิดรับ → ส่งมะรืน */
export function deliveryDateFor(cutoff: string, now = new Date()) {
  const { date, time } = bangkokNow(now);
  const beforeCutoff = time < cutoff.slice(0, 5);
  return { date: addDays(date, beforeCutoff ? 1 : 2), beforeCutoff };
}

export function formatThaiDate(isoDate: string, style: "long" | "short" = "long") {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
  }).format(d);
}

export function relativeDayLabel(isoDate: string) {
  const today = bangkokNow().date;
  if (isoDate === today) return "วันนี้";
  if (isoDate === addDays(today, 1)) return "พรุ่งนี้";
  if (isoDate === addDays(today, 2)) return "มะรืนนี้";
  if (isoDate === addDays(today, -1)) return "เมื่อวาน";
  return null;
}

export const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
