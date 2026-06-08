-- =============================================
-- 選手ノートアプリ マイグレーション
-- =============================================

-- 選手マスタ（ログインユーザーとは独立）
CREATE TABLE IF NOT EXISTS players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  number      text,
  position    text,
  sport       text NOT NULL DEFAULT 'soccer',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 選手目標（年間・前期・後期）
CREATE TABLE IF NOT EXISTS player_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  year        int NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  semester    text NOT NULL CHECK (semester IN ('annual', 'first', 'second')),
  content     text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, year, semester)
);

-- コーチコメント（試合紐付けは任意）
CREATE TABLE IF NOT EXISTS player_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id    uuid REFERENCES matches(id) ON DELETE SET NULL,
  comment     text NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- フィジカルログ（選手個別のトレーニング・ラン記録）
CREATE TABLE IF NOT EXISTS player_physical_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  log_date    date NOT NULL DEFAULT CURRENT_DATE,
  menu        text,
  distance_km numeric(5,2),
  notes       text,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- トレーナー全体コメント（気になった時に投稿）
CREATE TABLE IF NOT EXISTS trainer_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_physical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_comments ENABLE ROW LEVEL SECURITY;

-- 全会員閲覧OK、書き込みはスタッフ・管理者のみ
CREATE POLICY "players_select" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "players_update" ON players FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "players_delete" ON players FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "player_goals_select" ON player_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_goals_insert" ON player_goals FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "player_goals_update" ON player_goals FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "player_goals_delete" ON player_goals FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "player_comments_select" ON player_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_comments_insert" ON player_comments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "player_comments_delete" ON player_comments FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "player_physical_select" ON player_physical_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_physical_insert" ON player_physical_logs FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "player_physical_delete" ON player_physical_logs FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "trainer_comments_select" ON trainer_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "trainer_comments_insert" ON trainer_comments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "trainer_comments_delete" ON trainer_comments FOR DELETE TO authenticated USING (is_admin());

-- =============================================
-- 選手初期データ（サンプル10名 - 後で実名に差し替え）
-- =============================================
-- INSERT INTO players (name, number, position) VALUES
--   ('山田 太郎', '10', 'FW'),
--   ('鈴木 一郎', '1',  'GK'),
--   ...
-- 実名データはダッシュボードから登録するか、別途CSVで追加してください
