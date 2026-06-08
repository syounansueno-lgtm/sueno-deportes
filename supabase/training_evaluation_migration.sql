-- =============================================
-- トレーニングメニュー & 試合評価 マイグレーション
-- =============================================

-- トレーニングメニュー（全選手共通）
CREATE TABLE IF NOT EXISTS training_menus (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  category         text,
  content          text NOT NULL,
  duration_minutes int,
  notes            text,
  created_by       uuid NOT NULL REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 試合ごとの選手評価
CREATE TABLE IF NOT EXISTS match_player_evaluations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rating      int CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

-- RLS
ALTER TABLE training_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_menus_select" ON training_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_menus_insert" ON training_menus FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "training_menus_update" ON training_menus FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "training_menus_delete" ON training_menus FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "match_eval_select" ON match_player_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_eval_insert" ON match_player_evaluations FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "match_eval_update" ON match_player_evaluations FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "match_eval_delete" ON match_player_evaluations FOR DELETE TO authenticated USING (is_admin());
