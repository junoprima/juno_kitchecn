export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  daily_limit: number | null;
  is_available: boolean;
  sort_order: number;
  options: OptionGroup[];
};

/** กลุ่มตัวเลือกของเมนู: single = เลือก 1 อย่าง (เช่น ไข่ต้ม/ไข่ดาว), multi = ติ๊กได้หลายอย่าง (เช่น ของเพิ่ม) */
export type OptionGroup = { name: string; type: "single" | "multi"; required: boolean; choices: OptionChoice[] };
export type OptionChoice = { name: string; price: number };
/** ตัวเลือกที่ลูกค้าเลือก (เก็บชื่อ/ราคา ณ ตอนสั่ง) */
export type ChosenOption = { group: string; name: string; price: number };

export type ShopSettings = {
  accepting_orders: boolean;
  cutoff_time: string; // "HH:MM:SS"
  notice: string;
};

export type OrderStatus = "new" | "confirmed" | "done" | "cancelled";

export type OrderLine = { name: string; price: number; qty: number; options: ChosenOption[] };

export type Order = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  note: string;
  delivery_date: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  items: OrderLine[];
};
