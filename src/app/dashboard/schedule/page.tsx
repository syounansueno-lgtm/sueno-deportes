'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Clock, CheckCircle, XCircle, HelpCircle, Plus, X } from 'lucide-react'
import type { Event, Attendance } from '@/types'
import { SPORT_LABELS, SPORT_COLORS } from '@/types'

const EVENT_TYPE_LABELS = {
  practice: '練習',
  game: '試合',
  tournament: '大会',
  other: 'その他',
}

const ATTENDANCE_OPTIONS = [
  { value: 'attending', label: '参加', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'absent', label: '欠席', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'undecided', label: '未定', icon: HelpCircle, color: 'bg-gray-400 hover:bg-gray-500 text-white' },
]

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    sport: 'soccer',
    event_type: 'practice',
    start_at: '',
    end_at: '',
    location: '',
    description: '',
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [eventsRes, attendancesRes, profileRes] = await Promise.all([
        supabase.from('events')
          .select('*')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true }),
        supabase.from('attendances')
          .select('*')
          .eq('user_id', user.id),
        supabase.from('profiles')
          .select('role')
          .eq('id', user.id)
          .single(),
      ])

      setEvents(eventsRes.data ?? [])
      setIsAdmin(profileRes.data?.role === 'admin')

      const map: Record<string, Attendance> = {}
      for (const a of attendancesRes.data ?? []) {
        map[a.event_id] = a
      }
      setAttendances(map)
      setLoading(false)
    }
    load()
  }, [])

  async function setAttendance(eventId: string, status: 'attending' | 'absent' | 'undecided') {
    if (!userId) return

    const { data } = await supabase
      .from('attendances')
      .upsert({ event_id: eventId, user_id: userId, status, responded_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })
      .select()
      .single()

    if (data) {
      setAttendances(prev => ({ ...prev, [eventId]: data }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.start_at || !form.end_at) return
    setSubmitting(true)

    const { data, error } = await supabase.from('events').insert({
      title: form.title,
      sport: form.sport,
      event_type: form.event_type,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      location: form.location || null,
      description: form.description || null,
      created_by: userId,
    }).select().single()

    if (!error && data) {
      setEvents(prev => [...prev, data].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()))
      setShowForm(false)
      setForm({ title: '', sport: 'soccer', event_type: 'practice', start_at: '', end_at: '', location: '', description: '' })
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">予定・出欠確認</h1>
        {isAdmin && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            予定を追加
          </Button>
        )}
      </div>

      {/* 予定追加フォーム（管理者のみ） */}
      {showForm && (
        <Card className="mb-6 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">新しい予定を追加</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">タイトル *</label>
                <Input
                  placeholder="例：U13練習"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">スポーツ</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={form.sport}
                    onChange={e => setForm(p => ({ ...p, sport: e.target.value }))}
                  >
                    <option value="soccer">サッカー</option>
                    <option value="karate">空手</option>
                    <option value="pickleball">ピックルボール</option>
                    <option value="gymnastics">体操</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">種別</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={form.event_type}
                    onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}
                  >
                    <option value="practice">練習</option>
                    <option value="game">試合</option>
                    <option value="tournament">大会</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">開始日時 *</label>
                  <Input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">終了日時 *</label>
                  <Input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={e => setForm(p => ({ ...p, end_at: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">場所</label>
                <Input
                  placeholder="例：相模原市立総合体育館"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">備考</label>
                <Input
                  placeholder="例：持ち物など"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? '追加中...' : '追加する'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            今後の予定はありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const myAttendance = attendances[event.id]
            const current = myAttendance?.status ?? 'undecided'

            return (
              <Card key={event.id} className="overflow-hidden">
                <div className="h-1.5 bg-green-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={SPORT_COLORS[event.sport]}>
                          {SPORT_LABELS[event.sport].split('（')[0]}
                        </Badge>
                        <Badge variant="outline">
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        {format(new Date(event.start_at), 'M/d', { locale: ja })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.start_at), 'E曜日', { locale: ja })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {format(new Date(event.start_at), 'HH:mm', { locale: ja })}
                      {' 〜 '}
                      {format(new Date(event.end_at), 'HH:mm', { locale: ja })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                  )}

                  {/* 出欠ボタン */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-medium">出欠を回答してください</p>
                    <div className="flex gap-2">
                      {ATTENDANCE_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                        <Button
                          key={value}
                          size="sm"
                          className={`flex items-center gap-1.5 ${
                            current === value
                              ? color
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          onClick={() => setAttendance(event.id, value as 'attending' | 'absent' | 'undecided')}
                        >
                          <Icon size={14} />
                          {label}
                        </Button>
                      ))}
                    </div>
                    {myAttendance && (
                      <p className="text-xs text-gray-400 mt-2">
                        回答済み（{format(new Date(myAttendance.responded_at), 'M/d HH:mm', { locale: ja })}）
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
