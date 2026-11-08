-- ตัวอย่างเมนู (ลบ/แก้ได้ในหน้า /admin/menu) — รันเฉพาะตอนตารางยังว่าง
insert into menu_items (name, description, price, daily_limit, sort_order)
select * from (values
  ('ข้าวกะเพราหมูสับ ไข่ดาว', 'เผ็ดกลาง แยกไข่ได้', 60, 20, 1),
  ('แกงเขียวหวานไก่ + ข้าว', 'กะทิสด มะเขือเปราะ', 70, 15, 2),
  ('ข้าวมันไก่', 'น้ำจิ้มเต้าเจี้ยวสูตรบ้าน', 55, null, 3),
  ('ต้มจืดเต้าหู้หมูสับ (ถุง)', 'สำหรับ 2 คน', 80, 10, 4),
  ('ขนมชั้นใบเตย', 'กล่องละ 6 ชิ้น', 45, null, 5)
) as v(name, description, price, daily_limit, sort_order)
where not exists (select 1 from menu_items);
