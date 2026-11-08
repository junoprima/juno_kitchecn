import type { OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "รอแม่ยืนยัน",
  confirmed: "แม่รับออเดอร์แล้ว",
  done: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

const STYLE: Record<OrderStatus, string> = {
  new: "bg-marigold/30 text-marigold-ink",
  confirmed: "bg-enamel-tint text-enamel-deep",
  done: "bg-sky-tint text-sky",
  cancelled: "bg-chili-tint text-chili",
};

export function StatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${STYLE[status]}`}>
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
