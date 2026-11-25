import type { ChosenOption, OptionGroup } from "./types";

/** picks[i] = index ของตัวเลือกที่เลือกในกลุ่มที่ i */
export type Picks = number[][];

export const emptyPicks = (groups: OptionGroup[]): Picks =>
  groups.map((g) => (g.type === "single" && g.required && g.choices.length ? [0] : []));

/** ตรวจตัวเลือกของลูกค้ากับเมนูล่าสุด แล้วคืนรายการที่เลือก + ราคาที่บวกเพิ่ม */
export function resolvePicks(groups: OptionGroup[], picks: unknown): { chosen: ChosenOption[]; extra: number } | { error: string } {
  const arr = Array.isArray(picks) ? picks : [];
  const chosen: ChosenOption[] = [];
  for (const [gi, g] of groups.entries()) {
    const raw = Array.isArray(arr[gi]) ? (arr[gi] as unknown[]) : [];
    const idx = [...new Set(raw.map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < g.choices.length);
    if (g.type === "single" && idx.length > 1) return { error: `“${g.name}” เลือกได้อย่างเดียว` };
    if (g.required && idx.length === 0) return { error: `ยังไม่ได้เลือก “${g.name}”` };
    for (const i of idx.sort((a, b) => a - b)) chosen.push({ group: g.name, name: g.choices[i].name, price: g.choices[i].price });
  }
  return { chosen, extra: chosen.reduce((s, c) => s + c.price, 0) };
}

/** ข้อความสั้นๆ ของตัวเลือก เช่น "ไข่ดาว, +พริกน้ำปลา" */
export function optionText(chosen: ChosenOption[], groups?: OptionGroup[]) {
  return chosen
    .map((c) => {
      const multi = groups ? groups.find((g) => g.name === c.group)?.type === "multi" : c.price > 0;
      return multi ? `+${c.name}` : c.name;
    })
    .join(", ");
}

/** ตรวจ/ทำความสะอาดตัวเลือกที่แม่ตั้งในหลังร้าน */
export function sanitizeGroups(raw: unknown): OptionGroup[] | { error: string } {
  if (!Array.isArray(raw)) return [];
  const out: OptionGroup[] = [];
  for (const g of raw.slice(0, 10)) {
    const name = String(g?.name ?? "").trim().slice(0, 40);
    const choices = (Array.isArray(g?.choices) ? g.choices : [])
      .slice(0, 20)
      .map((c: { name?: unknown; price?: unknown }) => ({
        name: String(c?.name ?? "").trim().slice(0, 40),
        price: Math.round(Number(c?.price) || 0),
      }))
      .filter((c: { name: string }) => c.name);
    if (!name && choices.length === 0) continue;
    if (!name) return { error: "ตั้งชื่อกลุ่มตัวเลือกด้วย เช่น “ไข่” หรือ “เพิ่มเติม”" };
    if (choices.length === 0) return { error: `กลุ่ม “${name}” ยังไม่มีตัวเลือก` };
    if (choices.some((c: { price: number }) => c.price < 0 || c.price > 9999)) return { error: "ราคาตัวเลือกต้องเป็น 0–9999" };
    const type = g?.type === "multi" ? "multi" : "single";
    out.push({ name, type, required: type === "single" && g?.required !== false, choices });
  }
  return out;
}
