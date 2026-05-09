-- =============================================
-- セキュリティ強化 SQL
-- =============================================

-- 1. profilesのINSERTポリシー（トリガー経由のみ許可）
-- 直接INSERTは禁止し、トリガー経由のみに限定
DROP POLICY IF EXISTS "profiles_insert" ON profiles;

-- 2. 管理者のみ他ユーザーのroleを変更できる
CREATE OR REPLACE FUNCTION is_own_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. role変更は管理者のみ（一般ユーザーは自分のroleを変更不可）
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- role変更は管理者のみ
    (role = (SELECT role FROM profiles WHERE id = auth.uid()) OR is_admin())
    AND
    -- membership_statusの変更は管理者のみ
    (membership_status = (SELECT membership_status FROM profiles WHERE id = auth.uid()) OR is_admin())
  );

-- 4. paymentsへの直接INSERTを禁止（サーバーサイドのみ）
DROP POLICY IF EXISTS "payments_insert" ON payments;
-- payments書き込みはservice_roleのみ（Webhook経由）

-- 5. 管理者はすべてのprofilesを更新可能
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin());

-- 6. 古いセッションの自動期限切れ設定確認
-- （Supabaseダッシュボードの認証設定で設定）

-- 7. SQLインジェクション対策：パラメータ化クエリを強制する
-- （アプリケーション側で対応済み）

-- 8. 監査ログ用テーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ監査ログを閲覧
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated USING (is_admin());

-- 監査ログへの書き込みはサービスロールのみ
-- （直接書き込み禁止）

-- 9. payments テーブルのDELETE禁止（支払い記録は削除不可）
-- paymentsにはDELETEポリシーを作成しない（デフォルトで拒否）

-- 10. 不審なアクセスパターン検知用ビュー
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT
  user_id,
  COUNT(*) as failed_count,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 5;
