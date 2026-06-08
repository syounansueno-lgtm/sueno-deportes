-- =============================================
-- フィジカル強化チェック マイグレーション
-- =============================================

-- グローバルチェック項目（全選手共通・いつでも追加可能）
CREATE TABLE IF NOT EXISTS physical_check_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 選手ごとのチェック状態＋コメント
CREATE TABLE IF NOT EXISTS player_physical_checks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id    uuid NOT NULL REFERENCES physical_check_items(id) ON DELETE CASCADE,
  checked    boolean NOT NULL DEFAULT true,
  comment    text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, item_id)
);

-- RLS
ALTER TABLE physical_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_physical_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_items_select" ON physical_check_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "check_items_insert" ON physical_check_items FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "check_items_update" ON physical_check_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "check_items_delete" ON physical_check_items FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "player_checks_select" ON player_physical_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_checks_insert" ON player_physical_checks FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "player_checks_update" ON player_physical_checks FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "player_checks_delete" ON player_physical_checks FOR DELETE TO authenticated USING (is_admin());

-- 初期項目
INSERT INTO physical_check_items (label, sort_order) VALUES
  ('スピード・ダッシュ', 1),
  ('体幹・バランス',     2),
  ('持久力・スタミナ',   3),
  ('下半身筋力',         4),
  ('上半身筋力',         5),
  ('柔軟性',             6),
  ('アジリティ',         7),
  ('ジャンプ力',         8)
ON CONFLICT (label) DO NOTHING;
