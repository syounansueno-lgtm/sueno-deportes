-- =============================================
-- スエニョデポルテス 会員管理システム DB スキーマ
-- =============================================

-- 競技種別（enum）
CREATE TYPE sport_type AS ENUM ('soccer', 'karate', 'pickleball', 'gymnastics');
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'player', 'parent', 'member');
CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE event_type AS ENUM ('practice', 'game', 'tournament', 'other');
CREATE TYPE attendance_status AS ENUM ('attending', 'absent', 'undecided');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'failed', 'refunded');
CREATE TYPE match_result AS ENUM ('win', 'lose', 'draw');

-- =============================================
-- プロフィール（auth.users と連携）
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'member',
  sports sport_type[] NOT NULL DEFAULT '{}',
  jersey_number TEXT,
  position TEXT,
  birth_date DATE,
  stripe_customer_id TEXT UNIQUE,
  membership_status membership_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- プロフィール自動作成トリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 試合記録
-- =============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport sport_type NOT NULL,
  opponent TEXT NOT NULL,
  match_date DATE NOT NULL,
  location TEXT,
  score_us INT,
  score_them INT,
  result match_result,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- イベント（練習・試合・大会）
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sport sport_type NOT NULL,
  event_type event_type NOT NULL DEFAULT 'practice',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 出欠確認
-- =============================================
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'undecided',
  comment TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- =============================================
-- お知らせ
-- =============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'all', -- 'all' or sport_type
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 写真アルバム
-- =============================================
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES profiles(id),
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 決済・会費管理
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INT NOT NULL, -- 円
  fee_amount INT NOT NULL DEFAULT 0, -- 手数料（会員負担）
  description TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 月額会費プラン
-- =============================================
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport sport_type NOT NULL,
  name TEXT NOT NULL,
  amount INT NOT NULL,
  stripe_price_id TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初期会費プラン
INSERT INTO membership_plans (sport, name, amount, description) VALUES
  ('soccer', 'サッカー月額会費', 5000, 'ヴェルディ相模原 月額会費'),
  ('karate', '空手月額会費', 4000, '空手教室 月額会費'),
  ('pickleball', 'ピックルボール月額会費', 3000, 'ピックルボール教室 月額会費'),
  ('gymnastics', '体操月額会費', 3500, '体操教室 月額会費');

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- プロフィール：自分のみ編集、ログイン済みなら閲覧可
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 管理者判定関数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- イベント：全会員閲覧可、管理者のみ作成・編集
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (is_admin());

-- 出欠：自分の出欠のみ編集
CREATE POLICY "attendances_select" ON attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendances_insert" ON attendances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendances_update" ON attendances FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- お知らせ：全会員閲覧、管理者のみ投稿
CREATE POLICY "announcements_select" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "announcements_update" ON announcements FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "announcements_delete" ON announcements FOR DELETE TO authenticated USING (is_admin());

-- 写真：全会員閲覧、ログイン済みなら投稿
CREATE POLICY "photos_select" ON photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_insert" ON photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "photos_delete" ON photos FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR is_admin());

-- 決済：自分のみ閲覧、管理者は全件
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- 試合記録：全会員閲覧、管理者のみ編集
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated USING (is_admin());

-- 会費プラン：全会員閲覧
CREATE POLICY "membership_plans_select" ON membership_plans FOR SELECT TO authenticated USING (true);

-- =============================================
-- Storage バケット（写真用）
-- =============================================
-- Supabaseダッシュボードで "photos" バケットを作成し、
-- "Authenticated users can upload" に設定してください
