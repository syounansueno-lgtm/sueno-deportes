import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import UnreadBadge from '@/components/layout/UnreadBadge'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 認証チェックとプロフィール取得を並列実行
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  // スタッフ・管理者のみアクセス許可
  const role = (profile as Profile | null)?.role
  if (role !== 'admin' && role !== 'staff') {
    redirect('/login')
  }

  // 未読バッジはSuspenseで非ブロッキング表示（UnreadBadgeコンポーネントが担当）

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile as Profile | null} unreadBadge={<UnreadBadge userId={user.id} />} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
