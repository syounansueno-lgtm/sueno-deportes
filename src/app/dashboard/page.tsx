import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Bell, Image, BookOpen, Users, BarChart3, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Profile, Event, Announcement } from '@/types'
import { SPORT_LABELS, SPORT_COLORS } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, eventsRes, announcementsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('events')
      .select('*')
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(5),
    supabase.from('announcements')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(5),
  ])

  const profile = profileRes.data as Profile | null
  const events = (eventsRes.data ?? []) as Event[]
  const announcements = (announcementsRes.data ?? []) as Announcement[]

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff'

  const quickLinks = [
    { href: '/dashboard/schedule', label: '予定・出欠', icon: Calendar, color: 'bg-blue-500', desc: 'スケジュール確認・出欠登録' },
    { href: '/dashboard/announcements', label: 'お知らせ', icon: Bell, color: 'bg-orange-500', desc: '最新情報をチェック' },
    { href: '/dashboard/album', label: '写真アルバム', icon: Image, color: 'bg-purple-500', desc: '活動写真・試合記録' },
    { href: '/dashboard/diary', label: '活動日記', icon: BookOpen, color: 'bg-green-500', desc: 'ブログ・活動レポート' },
    ...(isAdmin ? [
      { href: '/dashboard/members', label: '会員管理', icon: Users, color: 'bg-gray-600', desc: '会員一覧・管理' },
      { href: '/dashboard/finance', label: '経理・会費', icon: BarChart3, color: 'bg-red-500', desc: '収支・会費管理' },
    ] : []),
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ウェルカム */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          こんにちは、{profile?.full_name ?? 'さん'} &#x1F44B;
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}
        </p>
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickLinks.map(({ href, label, icon: Icon, color, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <p className="font-semibold text-sm text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 直近の予定 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">直近の予定</CardTitle>
            <Link href="/dashboard/schedule" className="text-xs text-green-700 flex items-center gap-1 hover:underline">
              すべて見る <ChevronRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">予定はありません</p>
            ) : events.map(event => (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="text-center bg-gray-100 rounded-lg p-2 min-w-[48px]">
                  <p className="text-xs text-gray-500">{format(new Date(event.start_at), 'M/d', { locale: ja })}</p>
                  <p className="text-xs font-bold text-gray-700">{format(new Date(event.start_at), 'E', { locale: ja })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-xs ${SPORT_COLORS[event.sport]}`}>
                      {SPORT_LABELS[event.sport].split('（')[0]}
                    </Badge>
                    {event.location && (
                      <span className="text-xs text-gray-400 truncate">{event.location}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* お知らせ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">お知らせ</CardTitle>
            <Link href="/dashboard/announcements" className="text-xs text-green-700 flex items-center gap-1 hover:underline">
              すべて見る <ChevronRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">お知らせはありません</p>
            ) : announcements.map(a => (
              <div key={a.id} className="py-2 border-b last:border-0">
                <div className="flex items-start gap-2">
                  {a.is_urgent && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0">緊急</Badge>
                  )}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{a.title}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(a.published_at), 'M月d日', { locale: ja })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
