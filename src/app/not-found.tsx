import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="mt-1 text-ink-2">ลิงก์อาจพิมพ์ผิด หรือออเดอร์ถูกลบไปแล้ว</p>
      <Link href="/" className="mt-6 inline-block font-medium text-enamel underline">กลับไปหน้าสั่งอาหาร</Link>
    </main>
  );
}
