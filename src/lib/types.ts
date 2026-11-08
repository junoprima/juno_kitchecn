export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  daily_limit: number | null;
  is_available: boolean;
  sort_order: number;
};

export type ShopSettings = {
  accepting_orders: boolean;
  cutoff_time: string; // "HH:MM:SS"
  notice: string;
};

export type OrderStatus = "new" | "confirmed" | "done" | "cancelled";

export type OrderLine = { name: string; price: number; qty: number };

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
