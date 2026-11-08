import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "mk_admin";

function token() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", pw).update("mae-kitchen-admin-v1").digest("hex");
}

export function passwordMatches(input: string) {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return pw.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function sessionToken() {
  return token();
}

export async function isAdmin() {
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!v) return false;
  const t = token();
  return v.length === t.length && timingSafeEqual(Buffer.from(v), Buffer.from(t));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
