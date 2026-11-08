import "server-only";
import { sql } from "./db";
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
