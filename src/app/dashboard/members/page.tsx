import { createClient } from '@/lib/supabase/server'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // 管理者は全情報、スタッフは氏名・写真・スポーツのみ
  const selectFields = isAdmin
    ? 'id, full_name, email, phone, role, sports, jersey_number, position, birth_date, membership_status, avatar_url, created_at'
    : 'id, full_name, role, sports, avatar_url, jersey_number, position'

  const { data: members } = await supabase
    .from('profiles')
    .select(selectFields)
    .order('full_name')

  return (
    <MembersClient
      members={(members ?? []) as any}
      isAdmin={isAdmin}
    />
  )
}
