import { createClient } from '@/lib/supabase/server'
import AnnouncementsClient from './AnnouncementsClient'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // プロフィール・告知・既読・スタッフ一覧を並列取得
  const [
    { data: profile },
    { data: announcements },
    { data: myReads },
    { data: staffList },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('announcements').select(`
      *,
      announcement_reads(user_id, profiles(full_name)),
      author:profiles!announcements_author_id_fkey(full_name)
    `).order('published_at', { ascending: false }),
    supabase.from('announcement_reads').select('announcement_id').eq('user_id', user.id),
    supabase.from('profiles').select('id, full_name, role').in('role', ['admin', 'staff']).order('full_name'),
  ])

  const isAdmin = profile?.role === 'admin'
  const readIds = (myReads ?? []).map((r: { announcement_id: string }) => r.announcement_id)

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
