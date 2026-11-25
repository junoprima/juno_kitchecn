-- ครัวแม่ · Pre-order schema (PostgreSQL / Supabase)
-- รันไฟล์นี้ครั้งเดียวใน Supabase → SQL Editor (หรือ `npm run db:setup`)
-- รันซ้ำได้ ไม่ลบข้อมูลเดิม

create extension if not exists pgcrypto;

-- เมนูอาหาร
create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  description  text not null default '',
  price        integer not null check (price >= 0),          -- บาท (จำนวนเต็ม)
  daily_limit  integer check (daily_limit is null or daily_limit > 0), -- null = ไม่จำกัด
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ตั้งค่าร้าน (มีแถวเดียว id = 1)
create table if not exists shop_settings (
  id               smallint primary key default 1 check (id = 1),
  accepting_orders boolean not null default true,
  cutoff_time      time not null default '20:00',   -- ปิดรับออเดอร์ของพรุ่งนี้ เวลาไทย
  notice           text not null default ''          -- ประกาศสั้นๆ บนหน้าสั่ง
);
insert into shop_settings (id) values (1) on conflict (id) do nothing;

-- ออเดอร์
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,                 -- เลขสั้นๆ ให้ลูกค้าจำ เช่น A7K2
  customer_name text not null check (length(trim(customer_name)) > 0),
  phone         text not null default '',
  note          text not null default '',
  delivery_date date not null,                        -- วันที่ส่ง (วันถัดไป)
  status        text not null default 'new'
                check (status in ('new', 'confirmed', 'done', 'cancelled')),
  total         integer not null check (total >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists orders_delivery_date_idx on orders (delivery_date);

-- รายการในออเดอร์ (เก็บชื่อ/ราคา ณ ตอนสั่ง เผื่อแม่แก้เมนูทีหลัง)
create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name         text not null,
  price        integer not null check (price >= 0),
  qty          integer not null check (qty > 0)
);
create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_menu_item_id_idx on order_items (menu_item_id);

-- แอปเชื่อมต่อผ่าน DATABASE_URL ฝั่ง server เท่านั้น
-- เปิด RLS ไว้เพื่อกันไม่ให้ใครอ่าน/เขียนผ่าน Supabase public API (anon key) ได้
alter table menu_items    enable row level security;
alter table shop_settings enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;

-- รอบส่งพิเศษ: แม่เปิดรับล่วงหน้าเป็นรายวัน พร้อมเมนูเฉพาะของวันนั้น
create table if not exists delivery_days (
  date       date primary key,
  note       text not null default '',            -- ข้อความถึงลูกค้าสำหรับวันนั้น
  created_at timestamptz not null default now()
);

create table if not exists delivery_day_items (
  date         date not null references delivery_days(date) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  daily_limit  integer check (daily_limit is null or daily_limit > 0), -- null = ใช้ค่าจำกัดของเมนู
  primary key (date, menu_item_id)
);
create index if not exists delivery_day_items_menu_item_id_idx on delivery_day_items (menu_item_id);

alter table delivery_days      enable row level security;
alter table delivery_day_items enable row level security;

-- บน Supabase แอปใช้ role app_web (ถ้ามี) — ให้สิทธิ์เหมือนตารางอื่น
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_web') then
    grant select, insert, update, delete on delivery_days, delivery_day_items to app_web;
    if not exists (select 1 from pg_policies where tablename = 'delivery_days' and policyname = 'app_web_all') then
      create policy app_web_all on delivery_days for all to app_web using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where tablename = 'delivery_day_items' and policyname = 'app_web_all') then
      create policy app_web_all on delivery_day_items for all to app_web using (true) with check (true);
    end if;
  end if;
end $$;

-- ตัวเลือกเมนู เช่น ไข่ต้ม/ไข่ดาว, +พริกน้ำปลา +5
-- [{ "name": "ไข่", "type": "single"|"multi", "required": true, "choices": [{ "name": "ไข่ดาว", "price": 0 }] }]
alter table menu_items  add column if not exists options jsonb not null default '[]';
-- ตัวเลือกที่ลูกค้าเลือก ณ ตอนสั่ง: [{ "group": "ไข่", "name": "ไข่ดาว", "price": 0 }] (price ใน order_items รวมค่าตัวเลือกแล้ว)
alter table order_items add column if not exists options jsonb not null default '[]';
