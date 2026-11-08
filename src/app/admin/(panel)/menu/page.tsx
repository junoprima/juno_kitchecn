import { getMenu, getSettings } from "@/lib/queries";
import { MenuEditor } from "./MenuEditor";
import { SettingsForm } from "./SettingsForm";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
      <section aria-labelledby="menu-h">
        <h1 id="menu-h" className="font-display text-2xl font-semibold">เมนู</h1>
        <p className="text-ink-2">เพิ่ม แก้ราคา ปิดเมนูชั่วคราว หรือจำกัดจำนวนต่อวัน</p>
        <MenuEditor items={menu} />
      </section>
      <section aria-labelledby="shop-h" className="lg:sticky lg:top-20">
        <h2 id="shop-h" className="font-display text-2xl font-semibold">ร้าน</h2>
        <SettingsForm settings={settings} />
      </section>
    </div>
  );
}
