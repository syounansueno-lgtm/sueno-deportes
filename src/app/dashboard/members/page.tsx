import { createClient } from '@/lib/supabase/server'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // プロフィール（権限確認）と全会員を並列取得
  // 管理者かどうかに関係なく全フィールドを取得し、RLSでアクセス制御
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('profiles')
      .select('id, full_name, email, phone, role, sports, jersey_number, position, birth_date, membership_status, avatar_url, created_at')
      .order('full_name'),
  ])

  const isAdmin = profile?.role === 'admin'

  return (
    <MembersClient
      members={(members ?? []) as any}
      isAdmin={isAdmin}
    />
  )
}
