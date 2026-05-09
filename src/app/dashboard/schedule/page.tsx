'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [eventsRes, attendancesRes] = await Promise.all([
        supabase.from('events')
          .select('*')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true }),
        supabase.from('attendances')
          .select('*')
          .eq('user_id', user.id),
      ])

      setEvents(eventsRes.data ?? [])

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">予定・出欠確認</h1>

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
