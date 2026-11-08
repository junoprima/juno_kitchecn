"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { ADMIN_COOKIE, passwordMatches, requireAdmin, sessionToken } from "./auth";
import { deliveryDateFor } from "./dates";
import { getSettings } from "./queries";
import type { OrderStatus } from "./types";

/* ---------------- ลูกค้า: สั่งอาหาร ---------------- */

export type PlaceOrderState = { error?: string } | undefined;

const CODE_CHARS = "ACDEFGHJKMNPQRTUVWXY34679"; // ตัดตัวที่สับสน 0/O 1/I 5/S 8/B
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");

export async function placeOrder(_prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const name = String(form.get("customer_name") ?? "").trim().slice(0, 60);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20);
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  let cart: Record<string, number>;
  try {
    cart = JSON.parse(String(form.get("cart") ?? "{}"));
  } catch {
    return { error: "ข้อมูลตะกร้าไม่ถูกต้อง ลองรีเฟรชหน้าแล้วสั่งใหม่" };
  }

  if (!name) return { error: "ใส่ชื่อผู้สั่งก่อนนะ แม่จะได้รู้ว่าเป็นของใคร" };
  const wanted = Object.entries(cart)
    .map(([id, q]) => [id, Math.floor(Number(q))] as const)
    .filter(([, q]) => q > 0 && q <= 99);
  if (wanted.length === 0) return { error: "ยังไม่ได้เลือกเมนู" };

  const settings = await getSettings();
  if (!settings.accepting_orders) return { error: "ตอนนี้แม่ปิดรับออเดอร์อยู่ ไว้มาสั่งใหม่นะ" };
  const { date } = deliveryDateFor(settings.cutoff_time);

  let orderId: string;
  try {
    orderId = await sql.begin(async (tx) => {
      const ids = wanted.map(([id]) => id);
      // lock เมนูไว้ กันสั่งเกินจำนวนเมื่อมีคนกดพร้อมกัน
      const items = await tx<{ id: string; name: string; price: number; daily_limit: number | null; is_available: boolean }[]>`
        select id, name, price, daily_limit, is_available from menu_items
        where id = any(${ids}::uuid[]) for update`;
      const booked = await tx<{ menu_item_id: string; qty: number }[]>`
        select oi.menu_item_id, sum(oi.qty)::int as qty
        from order_items oi join orders o on o.id = oi.order_id
        where o.delivery_date = ${date} and o.status <> 'cancelled'
          and oi.menu_item_id = any(${ids}::uuid[])
        group by oi.menu_item_id`;
      const bookedMap = new Map(booked.map((b) => [b.menu_item_id, b.qty]));

      const lines = wanted.map(([id, qty]) => {
        const it = items.find((i) => i.id === id);
        if (!it || !it.is_available) throw new UserError("มีเมนูที่แม่เพิ่งปิดไป ลองรีเฟรชหน้าแล้วเลือกใหม่");
        if (it.daily_limit != null) {
          const left = it.daily_limit - (bookedMap.get(id) ?? 0);
          if (qty > left)
            throw new UserError(left <= 0 ? `${it.name} หมดแล้วสำหรับรอบนี้` : `${it.name} เหลือแค่ ${left} ที่`);
        }
        return { id, name: it.name, price: it.price, qty };
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
        lines.map((l) => ({ order_id: row!.id, menu_item_id: l.id, name: l.name, price: l.price, qty: l.qty })),
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
  return { data: { name, description, price, daily_limit } } as const;
}

export type FormState = { error?: string; ok?: number } | undefined;

export async function createMenuItem(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = readMenuForm(form);
  if ("error" in r) return { error: r.error };
  await sql`
    insert into menu_items (name, description, price, daily_limit, sort_order)
    values (${r.data.name}, ${r.data.description}, ${r.data.price}, ${r.data.daily_limit},
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
      price = ${r.data.price}, daily_limit = ${r.data.daily_limit}
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
