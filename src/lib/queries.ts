import "server-only";
import { sql } from "./db";
import { deliveryDateFor } from "./dates";
import type { MenuItem, Order, ShopSettings } from "./types";

export async function getSettings(): Promise<ShopSettings> {
  const [row] = await sql<ShopSettings[]>`
    select accepting_orders, to_char(cutoff_time, 'HH24:MI') as cutoff_time, notice
    from shop_settings where id = 1`;
  return row ?? { accepting_orders: false, cutoff_time: "20:00", notice: "" };
}

export async function getMenu(opts: { onlyAvailable?: boolean } = {}) {
  return sql<MenuItem[]>`
    select id, name, description, price, daily_limit, is_available, sort_order
    from menu_items
    ${opts.onlyAvailable ? sql`where is_available` : sql``}
    order by sort_order, created_at`;
}

/** จำนวนที่ถูกจองแล้วของแต่ละเมนูในวันส่งนั้น (ไม่นับออเดอร์ที่ยกเลิก) */
export async function getBookedQty(deliveryDate: string) {
  const rows = await sql<{ menu_item_id: string; qty: number }[]>`
    select oi.menu_item_id, sum(oi.qty)::int as qty
    from order_items oi join orders o on o.id = oi.order_id
    where o.delivery_date = ${deliveryDate} and o.status <> 'cancelled'
      and oi.menu_item_id is not null
    group by oi.menu_item_id`;
  return new Map(rows.map((r) => [r.menu_item_id, r.qty]));
}

const orderSelect = (where: ReturnType<typeof sql>) => sql<Order[]>`
  select o.id, o.code, o.customer_name, o.phone, o.note,
         to_char(o.delivery_date, 'YYYY-MM-DD') as delivery_date,
         o.status, o.total, o.created_at,
         coalesce(json_agg(json_build_object('name', oi.name, 'price', oi.price, 'qty', oi.qty)
                  order by oi.name) filter (where oi.id is not null), '[]') as items
  from orders o left join order_items oi on oi.order_id = o.id
  ${where}
  group by o.id
  order by o.created_at`;

export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await orderSelect(sql`where o.id = ${id}`);
  return o ?? null;
}

export async function getOrdersForDate(deliveryDate: string) {
  return orderSelect(sql`where o.delivery_date = ${deliveryDate}`);
}

/** วันส่งที่มีออเดอร์ (ไว้ทำตัวเลือกวัน) */
export async function getOrderDates() {
  const rows = await sql<{ d: string; n: number }[]>`
    select to_char(delivery_date, 'YYYY-MM-DD') as d, count(*)::int as n
    from orders where status <> 'cancelled'
    group by delivery_date order by delivery_date desc limit 14`;
  return rows;
}

/* ---------------- รอบส่ง ---------------- */

export type DeliveryDay = { date: string; note: string; items: { menu_item_id: string; daily_limit: number | null }[] };

/** รอบพิเศษที่แม่เปิดไว้ ตั้งแต่วันที่ fromDate เป็นต้นไป */
export async function getDeliveryDays(fromDate: string) {
  return sql<DeliveryDay[]>`
    select to_char(d.date, 'YYYY-MM-DD') as date, d.note,
           coalesce(json_agg(json_build_object('menu_item_id', i.menu_item_id, 'daily_limit', i.daily_limit))
                    filter (where i.menu_item_id is not null), '[]') as items
    from delivery_days d left join delivery_day_items i on i.date = d.date
    where d.date >= ${fromDate}
    group by d.date order by d.date`;
}

export async function getDeliveryDay(date: string) {
  const [d] = await getDeliveryDays(date);
  return d && d.date === date ? d : null;
}

export type Round = { date: string; special: boolean; note: string };

/**
 * วันส่งที่ลูกค้าเลือกได้ตอนนี้
 * - รอบปกติ: วันส่งถัดไปตามเวลาปิดรับ (ถ้าเปิดรับออเดอร์รายวันอยู่)
 * - รอบพิเศษ: ทุกวันที่แม่เปิดไว้ ที่ยังไม่เลยเวลาปิดรับ
 */
export async function getOpenRounds(settings: ShopSettings): Promise<Round[]> {
  const next = deliveryDateFor(settings.cutoff_time).date;
  const special = await getDeliveryDays(next);
  const rounds = new Map<string, Round>();
  if (settings.accepting_orders) rounds.set(next, { date: next, special: false, note: "" });
  for (const d of special) rounds.set(d.date, { date: d.date, special: true, note: d.note });
  return [...rounds.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** เมนูของวันส่งนั้น พร้อมจำนวนที่เหลือ */
export async function getMenuForDate(date: string) {
  const [day, all, booked] = await Promise.all([getDeliveryDay(date), getMenu(), getBookedQty(date)]);
  const picked = day ? new Map(day.items.map((i) => [i.menu_item_id, i.daily_limit])) : null;
  return all
    .filter((m) => (picked ? picked.has(m.id) : m.is_available))
    .map((m) => {
      const limit = picked?.get(m.id) ?? m.daily_limit;
      return { ...m, daily_limit: limit, left: limit == null ? null : Math.max(0, limit - (booked.get(m.id) ?? 0)) };
    });
}
