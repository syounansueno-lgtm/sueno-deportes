import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function UnreadBadge({ userId }: { userId: string }) {
  const supabase = await createClient()

  // アクティブなお知らせと既読を並列取得
  const now = new Date().toISOString()
  const [{ data: announcements }, { data: reads }] = await Promise.all([
    supabase.from('announcements').select('id').or(`expires_at.is.null,expires_at.gt.${now}`),
    supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId),
  ])

  const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id))
  const unreadCount = (announcements ?? []).filter(a => !readIds.has(a.id)).length

  if (unreadCount === 0) return null

  return (
    <Link href="/dashboard/announcements">
      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </Link>
  )
}
