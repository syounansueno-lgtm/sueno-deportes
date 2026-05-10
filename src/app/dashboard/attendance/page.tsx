import { createClient } from '@/lib/supabase/server'
import AttendanceClient from './AttendanceClient'
import { format } from 'date-fns'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')

  // プロフィール・今日の打刻・今月の打刻・今日の日報を並列取得
  const [
    { data: profile },
    { data: todayCard },
    { data: monthCards },
    { data: todayReport },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('timecards').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('timecards').select('*').eq('user_id', user.id).gte('date', monthStart).order('date', { ascending: true }),
    supabase.from('daily_reports').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
  ])

  const isAdmin = profile?.role === 'admin'

  // 管理者：全スタッフの今日の打刻（管理者のみ追加クエリ）
  let allStaffCards: any[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('timecards')
      .select('*, profiles(full_name)')
      .eq('date', today)
      .order('clock_in', { ascending: true })
    allStaffCards = data ?? []
  }

  return (
    <AttendanceClient
      userId={user.id}
      isAdmin={isAdmin}
      todayCard={todayCard ?? null}
      monthCards={monthCards ?? []}
      allStaffCards={allStaffCards}
      todayReport={todayReport ?? null}
    />
  )
}
