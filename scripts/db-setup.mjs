// npm run db:setup  — สร้างตาราง (+ --seed ใส่เมนูตัวอย่าง) ด้วย DATABASE_URL
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ไม่พบ DATABASE_URL — ใส่ใน .env.local หรือ export ก่อนรัน");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const files = ["db/schema.sql", ...(process.argv.includes("--seed") ? ["db/seed.sql"] : [])];

try {
  for (const f of files) {
    await sql.unsafe(readFileSync(f, "utf8"));
    console.log(`✓ ${f}`);
  }
} finally {
  await sql.end();
}
