-- =============================================
-- 物販・共有ライブラリ・備品管理 マイグレーション
-- =============================================

-- 物販商品テーブル
CREATE TABLE IF NOT EXISTS merchandise_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'other', -- uniform / goods / equipment / other
  sizes TEXT[], -- ['S','M','L','XL'] など
  stock INT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE merchandise_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchandise_items_select" ON merchandise_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "merchandise_items_insert" ON merchandise_items FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "merchandise_items_update" ON merchandise_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "merchandise_items_delete" ON merchandise_items FOR DELETE TO authenticated USING (is_admin());

-- 物販注文テーブル
CREATE TABLE IF NOT EXISTS merchandise_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES merchandise_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  size TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / confirmed / delivered / cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE merchandise_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchandise_orders_select" ON merchandise_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "merchandise_orders_insert" ON merchandise_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "merchandise_orders_update" ON merchandise_orders FOR UPDATE TO authenticated USING (is_admin());

-- 共有ライブラリテーブル
CREATE TABLE IF NOT EXISTS library_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT, -- pdf / image / video / other
  category TEXT NOT NULL DEFAULT 'other', -- manual / practice / form / minutes / other
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE library_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library_files_select" ON library_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "library_files_insert" ON library_files FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "library_files_delete" ON library_files FOR DELETE TO authenticated USING (is_admin());

-- 備品・忘れ物テーブル
CREATE TABLE IF NOT EXISTS equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'equipment', -- equipment / lost_found
  status TEXT NOT NULL DEFAULT 'available', -- available / in_use / lost / found / claimed / broken
  quantity INT NOT NULL DEFAULT 1,
  location TEXT,
  image_url TEXT,
  reported_by UUID REFERENCES profiles(id),
  claimed_by UUID REFERENCES profiles(id),
  found_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_items_select" ON equipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_items_insert" ON equipment_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "equipment_items_update" ON equipment_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "equipment_items_delete" ON equipment_items FOR DELETE TO authenticated USING (is_admin());

-- 初期備品サンプルデータ（任意）
-- INSERT INTO equipment_items (name, category, status, quantity, location) VALUES
--   ('サッカーボール', 'equipment', 'available', 10, 'クラブハウス'),
--   ('コーン', 'equipment', 'available', 20, 'クラブハウス'),
--   ('ビブス', 'equipment', 'available', 15, 'クラブハウス');
