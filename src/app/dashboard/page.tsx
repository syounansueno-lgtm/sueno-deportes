import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Megaphone, Clock, Users, Calendar, AlertTriangle } from 'lucide-react'
import type { Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const today = format(new Date(), 'yyyy-MM-dd')

  // 未読告知
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, is_urgent, published_at')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('published_at', { ascending: false })
    .limit(5)

  const { data: myReads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', user.id)

  const readIds = new Set((myReads ?? []).map((r: { announcement_id: string }) => r.announcement_id))
  const unreadAnnouncements = (announcements ?? []).filter(a => !readIds.has(a.id))

  // 今日の打刻
  const { data: todayCard } = await supabase
    .from('timecards')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  // 直近のイベント
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, start_at, location')
    .gte('start_at', new Date().toISOString())
    .order('start_at')
    .limit(3)

  const p = profile as Profile | null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ウェルカム */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          おはようございます、{p?.full_name ?? 'スタッフ'}さん
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}
        </p>
      </div>

      {/* 未読告知アラート */}
      {unreadAnnouncements.length > 0 && (
        <Link href="/dashboard/announcements">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 mb-4 flex items-start gap-3 hover:bg-amber-100 transition-colors">
            <AlertTriangle size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">
                未確認の告知が{unreadAnnouncements.length}件あります
              </p>
              {unreadAnnouncements[0]?.is_urgent && (
                <p className="text-sm text-red-600 font-medium mt-1">
                  🚨 緊急: {unreadAnnouncements[0].title}
                </p>
              )}
              <p className="text-xs text-amber-600 mt-1">タップして確認する →</p>
            </div>
          </div>
        </Link>
      )}

      {/* 今日の打刻ステータス */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              todayCard?.clock_in && todayCard?.clock_out
                ? 'bg-blue-100'
                : todayCard?.clock_in
                ? 'bg-green-100'
                : 'bg-gray-100'
            }`}>
              <Clock size={20} className={
                todayCard?.clock_in && todayCard?.clock_out
                  ? 'text-blue-500'
                  : todayCard?.clock_in
                  ? 'text-green-500'
                  : 'text-gray-400'
              } />
            </div>
            <div>
              <p className="font-medium text-gray-800">本日の勤怠</p>
              <p className="text-xs text-gray-500">
                {!todayCard?.clock_in
                  ? '未打刻'
                  : !todayCard?.clock_out
                  ? `出勤中 (${format(new Date(todayCard.clock_in), 'HH:mm')} 〜)`
                  : `${format(new Date(todayCard.clock_in), 'HH:mm')} 〜 ${format(new Date(todayCard.clock_out), 'HH:mm')}`
                }
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/attendance"
            className="text-sm text-green-600 font-medium"
          >
            打刻する →
          </Link>
        </div>
      </div>

      {/* クイックアクセス */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/dashboard/announcements" className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <Megaphone size={24} className="text-green-600 mb-2" />
          <p className="font-semibold text-gray-800">重要告知</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {unreadAnnouncements.length > 0
              ? <span className="text-amber-600 font-medium">未読 {unreadAnnouncements.length}件</span>
              : '全て確認済み'}
          </p>
        </Link>

        <Link href="/dashboard/attendance" className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <Clock size={24} className="text-blue-600 mb-2" />
          <p className="font-semibold text-gray-800">勤怠・日報</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {todayCard?.clock_in ? 'タップして退勤' : '出勤打刻する'}
          </p>
        </Link>

        <Link href="/dashboard/members" className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <Users size={24} className="text-purple-600 mb-2" />
          <p className="font-semibold text-gray-800">会員管理</p>
          <p className="text-xs text-gray-500 mt-0.5">メンバー一覧</p>
        </Link>

        <Link href="/dashboard/schedule" className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <Calendar size={24} className="text-orange-600 mb-2" />
          <p className="font-semibold text-gray-800">予定</p>
          <p className="text-xs text-gray-500 mt-0.5">カレンダー確認</p>
        </Link>
      </div>

      {/* 直近のイベント */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            直近の予定
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map((event: any) => (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="bg-orange-50 rounded-lg px-2 py-1 text-center min-w-[48px]">
                  <p className="text-xs text-orange-600 font-bold">{format(new Date(event.start_at), 'M/d')}</p>
                  <p className="text-xs text-orange-500">{format(new Date(event.start_at), 'HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{event.title}</p>
                  {event.location && (
                    <p className="text-xs text-gray-400">{event.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/schedule" className="text-xs text-green-600 font-medium mt-2 block text-right">
            全ての予定を見る →
          </Link>
        </div>
      )}
    </div>
  )
}
