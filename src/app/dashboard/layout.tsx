import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // スタッフ・管理者のみアクセス許可
  const role = (profile as Profile | null)?.role
  if (role !== 'admin' && role !== 'staff') {
    redirect('/login')
  }

  // 未読お知らせ数
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  let unreadCount = 0
  if (announcements && announcements.length > 0) {
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)

    const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id))
    unreadCount = announcements.filter(a => !readIds.has(a.id)).length
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile as Profile | null} unreadCount={unreadCount} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
