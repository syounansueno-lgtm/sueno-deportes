-- =============================================
-- スタッフ専用管理アプリ 追加マイグレーション
-- =============================================

-- 既読管理テーブル
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 勤怠打刻テーブル
CREATE TABLE IF NOT EXISTS timecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  clock_in_lat DOUBLE PRECISION,
  clock_in_lng DOUBLE PRECISION,
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE timecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timecards_select_own" ON timecards FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "timecards_insert" ON timecards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "timecards_update" ON timecards FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin());

-- 日報テーブル
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  weather TEXT,
  participants_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_reports_select" ON daily_reports FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "daily_reports_insert" ON daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reports_update" ON daily_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- お知らせにexpires_atカラム追加（存在しない場合）
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 勤怠updated_atトリガー
CREATE OR REPLACE FUNCTION update_timecard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timecards_updated_at
  BEFORE UPDATE ON timecards
  FOR EACH ROW EXECUTE FUNCTION update_timecard_updated_at();
