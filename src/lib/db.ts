import "server-only";
import postgres from "postgres";

declare global {
  var __sql: postgres.Sql | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare:false ใช้ได้กับ Supabase pooler (transaction mode, port 6543)
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
}

// reuse connection ระหว่าง hot-reload ตอน dev
export const sql: postgres.Sql = globalThis.__sql ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;
