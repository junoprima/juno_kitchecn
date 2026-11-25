import { baht } from "@/lib/dates";
import { optionText } from "@/lib/options";
import type { OrderLine } from "@/lib/types";

/** รายการในออเดอร์ พร้อมตัวเลือกที่ลูกค้าเลือก */
export function OrderLines({ items, className = "" }: { items: OrderLine[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((l, i) => (
        <li key={i} className="flex gap-2">
          <span className="w-7 shrink-0 font-semibold text-enamel">{l.qty}×</span>
          <span className="min-w-0 flex-1">
            {l.name}
            {l.options?.length > 0 && <span className="block text-sm leading-snug text-ink-2">{optionText(l.options)}</span>}
          </span>
          <span className="text-ink-2">{baht(l.price * l.qty)}</span>
        </li>
      ))}
    </ul>
  );
}
