"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { OptionGroup } from "@/lib/types";

type Draft = { name: string; type: "single" | "multi"; required: boolean; choices: { name: string; price: string }[] };

const toDraft = (g: OptionGroup): Draft => ({ ...g, choices: g.choices.map((c) => ({ name: c.name, price: c.price ? String(c.price) : "" })) });
const blank = (type: Draft["type"]): Draft => ({ name: "", type, required: type === "single", choices: [{ name: "", price: "" }, { name: "", price: "" }] });

/** แก้ตัวเลือกของเมนู ส่งค่าเป็น JSON ใน input name="options" */
export function OptionsEditor({ initial }: { initial: OptionGroup[] }) {
  const [groups, setGroups] = useState<Draft[]>(() => initial.map(toDraft));
  const set = (gi: number, patch: Partial<Draft>) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setChoice = (gi: number, ci: number, patch: Partial<Draft["choices"][number]>) =>
    set(gi, { choices: groups[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  const value = JSON.stringify(
    groups.map((g) => ({ ...g, choices: g.choices.filter((c) => c.name.trim()).map((c) => ({ name: c.name, price: Number(c.price) || 0 })) })),
  );

  return (
    <fieldset className="sm:col-span-3">
      <input type="hidden" name="options" value={value} />
      <legend className="mb-1 text-sm font-medium">
        ตัวเลือก <span className="font-normal text-ink-3">ไม่บังคับ เช่น ไข่ต้ม/ไข่ดาว หรือของเพิ่ม +฿</span>
      </legend>

      {groups.length > 0 && (
        <ul className="space-y-3">
          {groups.map((g, gi) => (
            <li key={gi} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={g.name}
                  onChange={(e) => set(gi, { name: e.target.value })}
                  maxLength={40}
                  placeholder={g.type === "single" ? "ชื่อกลุ่ม เช่น ไข่" : "ชื่อกลุ่ม เช่น เพิ่มเติม"}
                  aria-label="ชื่อกลุ่มตัวเลือก"
                  className="input min-w-0 flex-1 py-2"
                />
                <select
                  value={g.type}
                  onChange={(e) => {
                    const type = e.target.value as Draft["type"];
                    set(gi, { type, required: type === "single" });
                  }}
                  aria-label="แบบการเลือก"
                  className="input w-auto py-2"
                >
                  <option value="single">เลือก 1 อย่าง</option>
                  <option value="multi">ติ๊กได้หลายอย่าง</option>
                </select>
                <button type="button" onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))} className="icon-btn hover:text-chili" aria-label={`ลบกลุ่ม ${g.name}`}>
                  <X className="size-4" />
                </button>
              </div>
              {g.type === "single" && (
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" checked={g.required} onChange={(e) => set(gi, { required: e.target.checked })} className="size-4 accent-enamel" />
                  ลูกค้าต้องเลือก
                </label>
              )}
              <ul className="mt-2 space-y-2">
                {g.choices.map((c, ci) => (
                  <li key={ci} className="flex items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) => setChoice(gi, ci, { name: e.target.value })}
                      maxLength={40}
                      placeholder={g.type === "single" ? (ci === 0 ? "เช่น ไข่ดาว" : "เช่น ไข่ต้ม") : ci === 0 ? "เช่น พริกน้ำปลา" : "เช่น แจ่ว"}
                      aria-label="ชื่อตัวเลือก"
                      className="input min-w-0 flex-1 py-2"
                    />
                    <span className="text-sm text-ink-2">+฿</span>
                    <input
                      value={c.price}
                      onChange={(e) => setChoice(gi, ci, { price: e.target.value })}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      aria-label="ราคาเพิ่ม"
                      className="input w-20 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => set(gi, { choices: g.choices.filter((_, i) => i !== ci) })}
                      disabled={g.choices.length <= 1}
                      className="icon-btn hover:text-chili"
                      aria-label="ลบตัวเลือก"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => set(gi, { choices: [...g.choices, { name: "", price: "" }] })} className="btn-ghost mt-1 h-9 px-2 text-sm">
                <Plus className="size-4" aria-hidden /> เพิ่มตัวเลือก
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setGroups((gs) => [...gs, blank("single")])} className="btn-ghost h-9 border border-line text-sm">
          <Plus className="size-4" aria-hidden /> กลุ่มเลือก 1 อย่าง
        </button>
        <button type="button" onClick={() => setGroups((gs) => [...gs, blank("multi")])} className="btn-ghost h-9 border border-line text-sm">
          <Plus className="size-4" aria-hidden /> กลุ่มของเพิ่ม (ติ๊กได้หลายอย่าง)
        </button>
      </div>
    </fieldset>
  );
}
