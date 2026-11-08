import "server-only";
import postgres from "postgres";

declare global {
  var __sql: postgres.Sql | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  // ไม่ throw ตอน import เพื่อให้ build ผ่านได้ก่อนตั้งค่า env — จะ error ตอน query แทน
  if (!url) console.error("DATABASE_URL is not set — add it in Vercel → Settings → Environment Variables");
  // prepare:false ใช้ได้กับ Supabase pooler (transaction mode, port 6543)
  return postgres(url ?? "postgres://missing-database-url@127.0.0.1:1/none", { prepare: false, max: 5, idle_timeout: 20 });
}

// reuse connection ระหว่าง hot-reload ตอน dev
export const sql: postgres.Sql = globalThis.__sql ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;
