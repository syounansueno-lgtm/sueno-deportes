'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Clock, FileText, ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react'

type Timecard = {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  note: string | null
  profiles?: { full_name: string } | null
  user_id: string
}

type DailyReport = {
  id: string
  date: string
  content: string
  weather: string | null
  participants_count: number | null
}

type Props = {
  userId: string
  isAdmin: boolean
  todayCard: Timecard | null
  monthCards: Timecard[]
  allStaffCards: Timecard[]
  todayReport: DailyReport | null
}

export default function AttendanceClient({ userId, isAdmin, todayCard: initTodayCard, monthCards: initMonthCards, allStaffCards: initAllStaffCards, todayReport: initTodayReport }: Props) {
  const supabase = createClient()
  const [todayCard, setTodayCard] = useState(initTodayCard)
  const [monthCards, setMonthCards] = useState(initMonthCards)
  const [loading, setLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<string>('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'clock' | 'report' | 'admin'>('clock')
  const [report, setReport] = useState(initTodayReport?.content ?? '')
  const [weather, setWeather] = useState(initTodayReport?.weather ?? '')
  const [participants, setParticipants] = useState(initTodayReport?.participants_count?.toString() ?? '')
  const [reportSaved, setReportSaved] = useState(!!initTodayReport)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [allStaffCards, setAllStaffCards] = useState(initAllStaffCards)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function getGPS(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('位置情報が使用できません')
        resolve(null)
        return
      }
      setGpsStatus('位置情報取得中...')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus(`取得完了 (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setGpsStatus('位置情報の取得に失敗しました（記録なしで続行）')
          resolve(null)
        },
        { timeout: 10000, enableHighAccuracy: true }
      )
    })
  }

  async function clockIn() {
    setLoading(true)
    const gps = await getGPS()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('timecards')
      .upsert({
        user_id: userId,
        date: today,
        clock_in: now,
        clock_in_lat: gps?.lat ?? null,
        clock_in_lng: gps?.lng ?? null,
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (!error && data) {
      setTodayCard(data)
      setMonthCards(prev => {
        const idx = prev.findIndex(c => c.date === today)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = data
          return next
        }
        return [data, ...prev]
      })
    }
    setLoading(false)
  }

  async function clockOut() {
    if (!todayCard) return
    setLoading(true)
    const gps = await getGPS()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('timecards')
      .update({
        clock_out: now,
        clock_out_lat: gps?.lat ?? null,
        clock_out_lng: gps?.lng ?? null,
      })
      .eq('id', todayCard.id)
      .select()
      .single()

    if (!error && data) {
      setTodayCard(data)
    }
    setLoading(false)
  }

  async function saveReport() {
    const { error } = await supabase
      .from('daily_reports')
      .upsert({
        user_id: userId,
        date: today,
        content: report,
        weather: weather || null,
        participants_count: participants ? parseInt(participants) : null,
      }, { onConflict: 'user_id,date' })
    if (!error) setReportSaved(true)
  }

  function calcWorkTime(card: Timecard): string {
    if (!card.clock_in || !card.clock_out) return '-'
    const diff = new Date(card.clock_out).getTime() - new Date(card.clock_in).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}時間${m}分`
  }

  // 月カレンダー生成
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = getDay(monthStart)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">勤怠管理</h1>
      <p className="text-sm text-gray-500 mb-6">{format(currentTime, 'yyyy年M月d日（E） HH:mm:ss', { locale: ja })}</p>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {[
          { key: 'clock', label: '打刻', icon: Clock },
          { key: 'report', label: '日報', icon: FileText },
          ...(isAdmin ? [{ key: 'admin', label: 'スタッフ確認', icon: Users }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* 打刻タブ */}
      {activeTab === 'clock' && (
        <div className="space-y-4">
          {/* 今日の打刻ボタン */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <h2 className="font-bold text-gray-700 mb-4 text-center">
              {format(new Date(), 'M月d日（E）', { locale: ja })} の打刻
            </h2>

            <div className="flex gap-3 mb-4">
              <button
                onClick={clockIn}
                disabled={loading || !!todayCard?.clock_in}
                className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                  todayCard?.clock_in
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md active:scale-95'
                }`}
              >
                {todayCard?.clock_in
                  ? `出勤済み ${format(new Date(todayCard.clock_in), 'HH:mm')}`
                  : '🟢 出勤'}
              </button>
              <button
                onClick={clockOut}
                disabled={loading || !todayCard?.clock_in || !!todayCard?.clock_out}
                className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                  !todayCard?.clock_in || todayCard?.clock_out
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md active:scale-95'
                }`}
              >
                {todayCard?.clock_out
                  ? `退勤済み ${format(new Date(todayCard.clock_out), 'HH:mm')}`
                  : '🔵 退勤'}
              </button>
            </div>

            {gpsStatus && (
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                <MapPin size={12} />
                {gpsStatus}
              </div>
            )}

            {todayCard?.clock_in && todayCard?.clock_out && (
              <div className="mt-3 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-green-700 font-bold text-lg">{calcWorkTime(todayCard)}</p>
                <p className="text-green-600 text-xs">本日の勤務時間</p>
              </div>
            )}
          </div>

          {/* 今月の勤務履歴カレンダー */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
              <h2 className="font-bold text-gray-800">
                {format(viewMonth, 'yyyy年M月', { locale: ja })}
              </h2>
              <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                <ChevronRight size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                <div key={d} className={d === '日' ? 'text-red-400' : d === '土' ? 'text-blue-400' : ''}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const card = monthCards.find(c => c.date === dateStr)
                const today2 = isToday(day)
                const dow = getDay(day)
                return (
                  <div
                    key={dateStr}
                    className={`rounded-lg p-1 text-center text-xs ${
                      today2 ? 'ring-2 ring-green-500' : ''
                    } ${card?.clock_in ? 'bg-green-50' : 'bg-gray-50'}`}
                  >
                    <div className={`font-medium ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </div>
                    {card?.clock_in && (
                      <div className="text-green-600" style={{ fontSize: '9px' }}>
                        {format(new Date(card.clock_in), 'H:mm')}
                      </div>
                    )}
                    {card?.clock_out && (
                      <div className="text-blue-600" style={{ fontSize: '9px' }}>
                        {format(new Date(card.clock_out), 'H:mm')}
                      </div>
                    )}
                    {card?.clock_in && !card?.clock_out && today2 && (
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 日報タブ */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">
            {format(new Date(), 'M月d日（E）', { locale: ja })} の日報
          </h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">天気</label>
                <select
                  value={weather}
                  onChange={e => setWeather(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択</option>
                  <option value="晴れ">☀️ 晴れ</option>
                  <option value="曇り">☁️ 曇り</option>
                  <option value="雨">🌧️ 雨</option>
                  <option value="雪">❄️ 雪</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">参加者数</label>
                <input
                  type="number"
                  value={participants}
                  onChange={e => setParticipants(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="人数"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">活動内容・報告</label>
              <textarea
                rows={6}
                value={report}
                onChange={e => { setReport(e.target.value); setReportSaved(false) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="本日の活動内容、特記事項、連絡事項などを入力..."
              />
            </div>
            <button
              onClick={saveReport}
              disabled={!report.trim()}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              {reportSaved ? <span className="flex items-center justify-center gap-2"><CheckCircle2 size={18} />保存済み</span> : '日報を保存'}
            </button>
          </div>
        </div>
      )}

      {/* 管理者：スタッフ確認タブ */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-700">
            {format(new Date(), 'M月d日（E）', { locale: ja })} のスタッフ勤怠
          </h2>
          {allStaffCards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
              本日の打刻データはありません
            </div>
          ) : (
            allStaffCards.map(card => (
              <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{card.profiles?.full_name ?? '不明'}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {card.clock_in && (
                        <span className="text-green-600">出勤 {format(new Date(card.clock_in), 'HH:mm')}</span>
                      )}
                      {card.clock_out && (
                        <span className="text-blue-600">退勤 {format(new Date(card.clock_out), 'HH:mm')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {card.clock_in && card.clock_out ? (
                      <span className="bg-blue-50 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                        {calcWorkTime(card)}
                      </span>
                    ) : card.clock_in ? (
                      <span className="bg-green-50 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                        勤務中
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-400 text-sm px-3 py-1 rounded-full">未打刻</span>
                    )}
                    {(card.clock_in_lat || card.clock_out_lat) && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400">
                        <MapPin size={10} />GPS記録あり
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
