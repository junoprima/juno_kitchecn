import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vercel Cron เรียกวันละครั้ง ให้ Supabase (แพ็กเกจฟรี) เห็นว่ามีการใช้งาน
// จะได้ไม่ถูก pause อัตโนมัติเมื่อไม่มีคนใช้ 7 วัน
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    await sql`select 1 from shop_settings limit 1`;
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("keepalive failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
