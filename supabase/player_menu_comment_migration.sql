-- 選手ごとのトレーニングメニューコメント
CREATE TABLE IF NOT EXISTS player_menu_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  menu_id    uuid NOT NULL REFERENCES training_menus(id) ON DELETE CASCADE,
  comment    text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, menu_id)
);

ALTER TABLE player_menu_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_menu_comments_select" ON player_menu_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_menu_comments_insert" ON player_menu_comments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "player_menu_comments_update" ON player_menu_comments FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "player_menu_comments_delete" ON player_menu_comments FOR DELETE TO authenticated USING (is_admin());
