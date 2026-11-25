"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type postgres from "postgres";
import { sql } from "./db";
import { ADMIN_COOKIE, passwordMatches, requireAdmin, sessionToken } from "./auth";
import { addDays, bangkokNow } from "./dates";
import { getDeliveryDay, getOpenRounds, getSettings } from "./queries";
import { resolvePicks, sanitizeGroups } from "./options";
import type { ChosenOption, OptionGroup, OrderStatus } from "./types";

/* ---------------- ลูกค้า: สั่งอาหาร ---------------- */

export type PlaceOrderState = { error?: string } | undefined;

const CODE_CHARS = "ACDEFGHJKMNPQRTUVWXY34679"; // ตัดตัวที่สับสน 0/O 1/I 5/S 8/B
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");

export async function placeOrder(_prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const name = String(form.get("customer_name") ?? "").trim().slice(0, 60);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20);
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  // cart: [{ id, qty, picks }] — เมนูเดียวกันแต่ตัวเลือกต่างกันเป็นคนละบรรทัด
  let cart: unknown;
  try {
    cart = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    return { error: "ข้อมูลตะกร้าไม่ถูกต้อง ลองรีเฟรชหน้าแล้วสั่งใหม่" };
  }

  if (!name) return { error: "ใส่ชื่อผู้สั่งก่อนนะ แม่จะได้รู้ว่าเป็นของใคร" };
  const wanted = (Array.isArray(cart) ? cart : [])
    .slice(0, 50)
    .map((l) => ({ id: String(l?.id ?? ""), qty: Math.floor(Number(l?.qty)), picks: l?.picks }))
    .filter((l) => /^[0-9a-f-]{36}$/i.test(l.id) && l.qty > 0 && l.qty <= 99);
  if (wanted.length === 0) return { error: "ยังไม่ได้เลือกเมนู" };

  const settings = await getSettings();
  const rounds = await getOpenRounds(settings);
  const date = String(form.get("delivery_date") ?? "");
  if (!rounds.some((r) => r.date === date))
    return { error: rounds.length ? "รอบส่งนี้ปิดรับแล้ว ลองรีเฟรชหน้าแล้วเลือกวันใหม่" : "ตอนนี้แม่ปิดรับออเดอร์อยู่ ไว้มาสั่งใหม่นะ" };
  // รอบพิเศษ: ขายเฉพาะเมนูที่แม่เลือกไว้ และใช้จำนวนจำกัดของวันนั้น
  const day = await getDeliveryDay(date);
  const dayItems = day ? new Map(day.items.map((i) => [i.menu_item_id, i.daily_limit])) : null;

  let orderId: string;
  try {
    orderId = await sql.begin(async (tx) => {
      const ids = [...new Set(wanted.map((l) => l.id))];
      // lock เมนูไว้ กันสั่งเกินจำนวนเมื่อมีคนกดพร้อมกัน
      const items = await tx<
        { id: string; name: string; price: number; daily_limit: number | null; is_available: boolean; options: OptionGroup[] }[]
      >`
        select id, name, price, daily_limit, is_available, options from menu_items
        where id = any(${ids}::uuid[]) for update`;
      const booked = await tx<{ menu_item_id: string; qty: number }[]>`
        select oi.menu_item_id, sum(oi.qty)::int as qty
        from order_items oi join orders o on o.id = oi.order_id
        where o.delivery_date = ${date} and o.status <> 'cancelled'
          and oi.menu_item_id = any(${ids}::uuid[])
        group by oi.menu_item_id`;
      const bookedMap = new Map(booked.map((b) => [b.menu_item_id, b.qty]));

      // รวมจำนวนต่อเมนู (ทุกตัวเลือก) ไว้เช็คจำนวนจำกัด
      const qtyByItem = new Map<string, number>();
      for (const l of wanted) qtyByItem.set(l.id, (qtyByItem.get(l.id) ?? 0) + l.qty);

      const lines = wanted.map(({ id, qty, picks }) => {
        const it = items.find((i) => i.id === id);
        const sellable = it && (dayItems ? dayItems.has(id) : it.is_available);
        if (!it || !sellable) throw new UserError("มีเมนูที่แม่เพิ่งปิดไป ลองรีเฟรชหน้าแล้วเลือกใหม่");
        const limit = dayItems?.get(id) ?? it.daily_limit;
        if (limit != null) {
          const left = limit - (bookedMap.get(id) ?? 0);
          if ((qtyByItem.get(id) ?? qty) > left)
            throw new UserError(left <= 0 ? `${it.name} หมดแล้วสำหรับรอบนี้` : `${it.name} เหลือแค่ ${left} ที่`);
        }
        const opt = resolvePicks(it.options ?? [], picks);
        if ("error" in opt) throw new UserError(`${it.name}: ${opt.error}`);
        return { id, name: it.name, price: it.price + opt.extra, qty, options: opt.chosen };
      });
      const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

      let row: { id: string } | undefined;
      for (let i = 0; i < 5 && !row; i++) {
        [row] = await tx<{ id: string }[]>`
          insert into orders (code, customer_name, phone, note, delivery_date, total)
          values (${makeCode()}, ${name}, ${phone}, ${note}, ${date}, ${total})
          on conflict (code) do nothing returning id`;
      }
      if (!row) throw new Error("could not allocate order code");

      await tx`insert into order_items ${tx(
        lines.map((l) => ({
          order_id: row!.id,
          menu_item_id: l.id,
          name: l.name,
          price: l.price,
          qty: l.qty,
          options: tx.json(l.options as ChosenOption[] as unknown as postgres.JSONValue),
        })),
      )}`;
      return row.id;
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error(e);
    return { error: "ส่งออเดอร์ไม่สำเร็จ ลองกดอีกครั้ง" };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/order/${orderId}`);
}

class UserError extends Error {}

/* ---------------- แอดมิน: เข้าสู่ระบบ ---------------- */

export async function login(_prev: { error?: string } | undefined, form: FormData) {
  if (!passwordMatches(String(form.get("password") ?? ""))) return { error: "รหัสไม่ถูก ลองใหม่อีกครั้ง" };
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* ---------------- แอดมิน: เมนู ---------------- */

function readMenuForm(form: FormData) {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const description = String(form.get("description") ?? "").trim().slice(0, 160);
  const price = Math.round(Number(form.get("price")));
  const limitRaw = String(form.get("daily_limit") ?? "").trim();
  const daily_limit = limitRaw === "" ? null : Math.round(Number(limitRaw));
  if (!name) return { error: "ใส่ชื่อเมนู" } as const;
  if (!Number.isFinite(price) || price < 0) return { error: "ราคาต้องเป็นตัวเลข" } as const;
  if (daily_limit !== null && (!Number.isFinite(daily_limit) || daily_limit < 1))
    return { error: "จำนวนต่อวันต้องเป็น 1 ขึ้นไป หรือเว้นว่างถ้าไม่จำกัด" } as const;
  let rawOptions: unknown = [];
  try {
    rawOptions = JSON.parse(String(form.get("options") ?? "[]"));
  } catch {
    return { error: "ตัวเลือกไม่ถูกต้อง" } as const;
  }
  const options = sanitizeGroups(rawOptions);
  if ("error" in options) return { error: options.error } as const;
  return { data: { name, description, price, daily_limit, options } } as const;
}

export type FormState = { error?: string; ok?: number } | undefined;

export async function createMenuItem(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = readMenuForm(form);
  if ("error" in r) return { error: r.error };
  await sql`
    insert into menu_items (name, description, price, daily_limit, options, sort_order)
    values (${r.data.name}, ${r.data.description}, ${r.data.price}, ${r.data.daily_limit}, ${sql.json(r.data.options as unknown as postgres.JSONValue)},
            (select coalesce(max(sort_order), 0) + 1 from menu_items))`;
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function updateMenuItem(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const r = readMenuForm(form);
  if ("error" in r) return { error: r.error };
  await sql`
    update menu_items set name = ${r.data.name}, description = ${r.data.description},
      price = ${r.data.price}, daily_limit = ${r.data.daily_limit},
      options = ${sql.json(r.data.options as unknown as postgres.JSONValue)}
    where id = ${id}`;
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function toggleMenuItem(id: string, available: boolean) {
  await requireAdmin();
  await sql`update menu_items set is_available = ${available} where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function moveMenuItem(id: string, dir: -1 | 1) {
  await requireAdmin();
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`select id from menu_items order by sort_order, created_at for update`;
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    for (const [k, r] of rows.entries()) await tx`update menu_items set sort_order = ${k + 1} where id = ${r.id}`;
  });
  revalidatePath("/", "layout");
}

export async function deleteMenuItem(id: string) {
  await requireAdmin();
  await sql`delete from menu_items where id = ${id}`;
  revalidatePath("/", "layout");
}

/* ---------------- แอดมิน: ร้าน & ออเดอร์ ---------------- */

export async function updateSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const accepting = form.get("accepting_orders") === "on";
  const cutoff = String(form.get("cutoff_time") ?? "20:00");
  const notice = String(form.get("notice") ?? "").trim().slice(0, 200);
  if (!/^\d{2}:\d{2}$/.test(cutoff)) return { error: "เวลาไม่ถูกต้อง" };
  await sql`update shop_settings set accepting_orders = ${accepting}, cutoff_time = ${cutoff}, notice = ${notice} where id = 1`;
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

const STATUSES: OrderStatus[] = ["new", "confirmed", "done", "cancelled"];

export async function setOrderStatus(id: string, status: OrderStatus) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return;
  await sql`update orders set status = ${status} where id = ${id}`;
  revalidatePath("/", "layout");
}

/* ---------------- แอดมิน: รอบส่งพิเศษ ---------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveDeliveryDay(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const date = String(form.get("date") ?? "");
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) return { error: "เลือกวันส่งก่อน" };
  if (date < addDays(bangkokNow().date, 1)) return { error: "วันส่งต้องเป็นพรุ่งนี้หรือหลังจากนั้น" };
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  const ids = form.getAll("item").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return { error: "ติ๊กเลือกเมนูของวันนี้อย่างน้อย 1 อย่าง" };

  const rows: { date: string; menu_item_id: string; daily_limit: number | null }[] = [];
  for (const id of ids) {
    const raw = String(form.get(`limit_${id}`) ?? "").trim();
    const n = raw === "" ? null : Math.round(Number(raw));
    if (n !== null && (!Number.isFinite(n) || n < 1)) return { error: "จำนวนจำกัดต้องเป็น 1 ขึ้นไป หรือเว้นว่าง" };
    rows.push({ date, menu_item_id: id, daily_limit: n });
  }

  await sql.begin(async (tx) => {
    await tx`insert into delivery_days (date, note) values (${date}, ${note})
             on conflict (date) do update set note = excluded.note`;
    await tx`delete from delivery_day_items where date = ${date}`;
    await tx`insert into delivery_day_items ${tx(rows)}`;
  });
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function deleteDeliveryDay(date: string) {
  await requireAdmin();
  if (!ISO_DATE.test(date)) return;
  await sql`delete from delivery_days where date = ${date}`;
  revalidatePath("/", "layout");
}
