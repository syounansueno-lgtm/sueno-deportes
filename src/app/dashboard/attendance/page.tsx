import { createClient } from '@/lib/supabase/server'
import AttendanceClient from './AttendanceClient'
import { format } from 'date-fns'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')

  // 今日の打刻
  const { data: todayCard } = await supabase
    .from('timecards')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  // 今月の打刻
  const { data: monthCards } = await supabase
    .from('timecards')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', monthStart)
    .order('date', { ascending: true })

  // 今日の日報
  const { data: todayReport } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  // 管理者：全スタッフの今日の打刻
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
