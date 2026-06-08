-- =============================================
-- トレーナー質問箱
-- =============================================
CREATE TABLE IF NOT EXISTS trainer_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reply TEXT,
  replied_by UUID REFERENCES profiles(id),
  replied_at TIMESTAMPTZ
);

ALTER TABLE trainer_questions ENABLE ROW LEVEL SECURITY;

-- 全会員が質問を読める
CREATE POLICY "trainer_questions_select" ON trainer_questions
  FOR SELECT TO authenticated USING (true);

-- 全会員が質問を投稿できる
CREATE POLICY "trainer_questions_insert" ON trainer_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- スタッフ・管理者のみ返信・削除できる
CREATE POLICY "trainer_questions_update" ON trainer_questions
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "trainer_questions_delete" ON trainer_questions
  FOR DELETE TO authenticated USING (is_admin() OR auth.uid() = created_by);
