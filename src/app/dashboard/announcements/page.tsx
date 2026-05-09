import { createClient } from '@/lib/supabase/server'
import AnnouncementsClient from './AnnouncementsClient'
import type { Profile } from '@/types'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // 告知一覧（既読情報・投稿者付き）
  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      *,
      announcement_reads(user_id, profiles(full_name)),
      author:profiles!announcements_author_id_fkey(full_name)
    `)
    .order('published_at', { ascending: false })

  // 自分の既読ID
  const { data: myReads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', user.id)

  const readIds = (myReads ?? []).map((r: { announcement_id: string }) => r.announcement_id)

  // スタッフ・管理者一覧（既読状況表示用）
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'staff'])
    .order('full_name')

  return (
    <AnnouncementsClient
      announcements={(announcements ?? []) as any}
      readIds={readIds}
      isAdmin={isAdmin}
      userId={user.id}
      staffList={(staffList ?? []) as any}
    />
  )
}
