'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle, XCircle, HelpCircle, Plus, X } from 'lucide-react'
import type { Event, Attendance } from '@/types'

type GoogleEvent = {
  id: string
  title: string
  start_at: string
  end_at: string
  location: string | null
  description: string | null
  source: 'google'
}

type AnyEvent = (Event & { source?: 'app' }) | GoogleEvent

const ATTENDANCE_OPTIONS = [
  { value: 'attending', label: '参加', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'absent', label: '欠席', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'undecided', label: '未定', icon: HelpCircle, color: 'bg-gray-400 hover:bg-gray-500 text-white' },
]

export default function ScheduleClient({ isAdmin }: { isAdmin: boolean }) {
  const [events, setEvents] = useState<Event[]>([])
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '', sport: 'soccer', event_type: 'practice',
    start_at: '', end_at: '', location: '', description: '',
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [eventsRes, attendancesRes, googleRes] = await Promise.all([
        supabase.from('events').select('*').order('start_at', { ascending: true }),
        supabase.from('attendances').select('*').eq('user_id', user.id),
        fetch('/api/calendar').then(r => r.json()).catch(() => ({ events: [] })),
      ])

      setEvents(eventsRes.data ?? [])
      setGoogleEvents(googleRes.events ?? [])

      const map: Record<string, Attendance> = {}
      for (const a of attendancesRes.data ?? []) map[a.event_id] = a
      setAttendances(map)
      setLoading(false)
    }
    load()
  }, [])

  async function setAttendance(eventId: string, status: 'attending' | 'absent' | 'undecided') {
    if (!userId) return
    const { data } = await supabase.from('attendances')
      .upsert({ event_id: eventId, user_id: userId, status, responded_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })
      .select().single()
    if (data) setAttendances(prev => ({ ...prev, [eventId]: data }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.start_at || !form.end_at) return
    setSubmitting(true)
    const { data, error } = await supabase.from('events').insert({
      title: form.title, sport: form.sport, event_type: form.event_type,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      location: form.location || null, description: form.description || null,
      created_by: userId,
    }).select().single()
    if (!error && data) {
      setEvents(prev => [...prev, data].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()))
      setShowForm(false)
      setForm({ title: '', sport: 'soccer', event_type: 'practice', start_at: '', end_at: '', location: '', description: '' })
    }
    setSubmitting(false)
  }

  // カレンダーのセルを生成
  function buildCalendarDays() {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    const days: Date[] = []
    let d = start
    while (d <= end) { days.push(d); d = addDays(d, 1) }
    return days
  }

  function getEventsForDay(day: Date): AnyEvent[] {
    const appEvs = events.filter(e => isSameDay(new Date(e.start_at), day))
    const gEvs = googleEvents.filter(e => isSameDay(new Date(e.start_at), day))
    return [...appEvs.map(e => ({ ...e, source: 'app' as const })), ...gEvs]
  }

  function getDayEvents(): AnyEvent[] {
    if (!selectedDay) return []
    return getEventsForDay(selectedDay)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  const days = buildCalendarDays()
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">予定・出欠確認</h1>
        {isAdmin && (
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} />予定を追加
          </Button>
        )}
      </div>

      {/* 予定追加フォーム */}
      {showForm && (
        <Card className="mb-4 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">新しい予定を追加</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X size={16} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">タイトル *</label>
                <Input placeholder="例：U13練習" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">スポーツ</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.sport} onChange={e => setForm(p => ({ ...p, sport: e.target.value }))}>
                    <option value="soccer">サッカー</option>
                    <option value="karate">空手</option>
                    <option value="pickleball">ピックルボール</option>
                    <option value="gymnastics">体操</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">種別</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}>
                    <option value="practice">練習</option>
                    <option value="game">試合</option>
                    <option value="tournament">大会</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">開始日時 *</label>
                  <Input type="datetime-local" value={form.start_at} onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">終了日時 *</label>
                  <Input type="datetime-local" value={form.end_at} onChange={e => setForm(p => ({ ...p, end_at: e.target.value }))} required />
                </div>
              </div>
              <Input placeholder="場所" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              <Input placeholder="備考" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-3">
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={submitting}>
                  {submitting ? '追加中...' : '追加する'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>キャンセル</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 月間カレンダー */}
      <Card>
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={18} />
          </Button>
          <h2 className="text-lg font-bold">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const dayOfWeek = day.getDay()

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[80px] border-b border-r p-1 cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-green-50'}
                  ${isSelected ? 'bg-green-50 ring-2 ring-inset ring-green-400' : ''}
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday(day) ? 'bg-green-600 text-white' : ''}
                  ${!isCurrentMonth ? 'text-gray-300' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <div
                      key={ev.id + i}
                      className={`text-xs px-1 py-0.5 rounded truncate
                        ${'source' in ev && ev.source === 'google'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'}
                      `}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3}件</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 凡例 */}
        <div className="flex gap-4 px-4 py-2 border-t text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" />アプリ予定（出欠あり）</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" />Googleカレンダー</span>
        </div>
      </Card>

      {/* 選択した日のイベント詳細 */}
      {selectedDay && getDayEvents().length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-bold text-gray-700">
            {format(selectedDay, 'M月d日（E）', { locale: ja })} の予定
          </h3>
          {getDayEvents().map((ev, i) => {
            const isGoogle = 'source' in ev && ev.source === 'google'
            const appEvent = !isGoogle ? ev as Event : null
            const myAttendance = appEvent ? attendances[appEvent.id] : null
            const current = myAttendance?.status ?? 'undecided'

            return (
              <Card key={ev.id + i} className="overflow-hidden">
                <div className={`h-1 ${isGoogle ? 'bg-blue-500' : 'bg-green-600'}`} />
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={isGoogle ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {isGoogle ? 'Googleカレンダー' : 'アプリ予定'}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900">{ev.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(ev.start_at), 'HH:mm', { locale: ja })}
                      {' 〜 '}
                      {format(new Date(ev.end_at), 'HH:mm', { locale: ja })}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {ev.location}
                      </span>
                    )}
                  </div>
                  {ev.description && <p className="text-xs text-gray-500 mb-3">{ev.description}</p>}

                  {!isGoogle && appEvent && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">出欠を回答してください</p>
                      <div className="flex gap-2">
                        {ATTENDANCE_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                          <Button key={value} size="sm"
                            className={`flex items-center gap-1 text-xs ${current === value ? color : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            onClick={() => setAttendance(appEvent.id, value as 'attending' | 'absent' | 'undecided')}
                          >
                            <Icon size={12} />{label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {selectedDay && getDayEvents().length === 0 && (
        <div className="mt-4 text-center text-gray-400 text-sm py-4">
          {format(selectedDay, 'M月d日', { locale: ja })} の予定はありません
        </div>
      )}
    </div>
  )
}
