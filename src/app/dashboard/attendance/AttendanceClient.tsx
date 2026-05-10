'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Clock, FileText, ChevronLeft, ChevronRight, CheckCircle2, Users, Pencil, X, AlertCircle } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'clock' | 'report' | 'history' | 'admin'>('clock')
  const [report, setReport] = useState(initTodayReport?.content ?? '')
  const [weather, setWeather] = useState(initTodayReport?.weather ?? '')
  const [participants, setParticipants] = useState(initTodayReport?.participants_count?.toString() ?? '')
  const [reportSaved, setReportSaved] = useState(!!initTodayReport)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [allStaffCards, setAllStaffCards] = useState(initAllStaffCards)

  // 修正モーダル
  const [editTarget, setEditTarget] = useState<Timecard | null>(null)
  const [editIn, setEditIn] = useState('')
  const [editOut, setEditOut] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDone, setEditDone] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function openEdit(card: Timecard) {
    setEditTarget(card)
    setEditIn(card.clock_in ? format(new Date(card.clock_in), 'HH:mm') : '')
    setEditOut(card.clock_out ? format(new Date(card.clock_out), 'HH:mm') : '')
    setEditNote(card.note ?? '')
    setEditDone(false)
  }

  async function saveEdit() {
    if (!editTarget) return
    setEditSaving(true)

    // 日付 + 入力時刻を ISO に変換
    function toISO(dateStr: string, timeStr: string) {
      if (!timeStr) return null
      return new Date(`${dateStr}T${timeStr}:00`).toISOString()
    }

    const { data, error } = await supabase
      .from('timecards')
      .update({
        clock_in: toISO(editTarget.date, editIn),
        clock_out: toISO(editTarget.date, editOut),
        note: editNote || null,
      })
      .eq('id', editTarget.id)
      .select()
      .single()

    if (!error && data) {
      // 今日のカードなら更新
      if (editTarget.date === today) setTodayCard(data)
      // 月カレンダー更新
      setMonthCards(prev => prev.map(c => c.id === data.id ? data : c))
      setAllStaffCards(prev => prev.map(c => c.id === data.id ? data : c))
      setEditDone(true)
      setTimeout(() => {
        setEditTarget(null)
        setEditDone(false)
      }, 1200)
    }
    setEditSaving(false)
  }

  async function getGPS(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { setGpsStatus('位置情報が使用できません'); resolve(null); return }
      setGpsStatus('位置情報取得中...')
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGpsStatus(`取得完了`); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
        () => { setGpsStatus('位置情報なしで続行'); resolve(null) },
        { timeout: 10000, enableHighAccuracy: true }
      )
    })
  }

  async function clockIn() {
    setLoading(true)
    const gps = await getGPS()
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('timecards').upsert({
      user_id: userId, date: today, clock_in: now,
      clock_in_lat: gps?.lat ?? null, clock_in_lng: gps?.lng ?? null,
    }, { onConflict: 'user_id,date' }).select().single()
    if (!error && data) {
      setTodayCard(data)
      setMonthCards(prev => {
        const idx = prev.findIndex(c => c.date === today)
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
        return [data, ...prev]
      })
    }
    setLoading(false)
  }

  async function clockOut() {
    if (!todayCard) return
    setLoading(true)
    const gps = await getGPS()
    const { data, error } = await supabase.from('timecards').update({
      clock_out: new Date().toISOString(),
      clock_out_lat: gps?.lat ?? null, clock_out_lng: gps?.lng ?? null,
    }).eq('id', todayCard.id).select().single()
    if (!error && data) setTodayCard(data)
    setLoading(false)
  }

  async function saveReport() {
    const { error } = await supabase.from('daily_reports').upsert({
      user_id: userId, date: today, content: report,
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

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = getDay(monthStart)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">勤怠管理</h1>
      <p className="text-sm text-gray-500 mb-5">{format(currentTime, 'yyyy年M月d日（E） HH:mm:ss', { locale: ja })}</p>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-5 gap-0 overflow-x-auto">
        {[
          { key: 'clock', label: '打刻', icon: Clock },
          { key: 'report', label: '日報', icon: FileText },
          { key: 'history', label: '修正・履歴', icon: Pencil },
          ...(isAdmin ? [{ key: 'admin', label: 'スタッフ確認', icon: Users }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* 打刻タブ */}
      {activeTab === 'clock' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <h2 className="font-bold text-gray-700 mb-4 text-center">
              {format(new Date(), 'M月d日（E）', { locale: ja })} の打刻
            </h2>
            <div className="flex gap-3 mb-4">
              <button onClick={clockIn} disabled={loading || !!todayCard?.clock_in}
                className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                  todayCard?.clock_in ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md active:scale-95'}`}>
                {todayCard?.clock_in ? `出勤済み ${format(new Date(todayCard.clock_in), 'HH:mm')}` : '🟢 出勤'}
              </button>
              <button onClick={clockOut} disabled={loading || !todayCard?.clock_in || !!todayCard?.clock_out}
                className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                  !todayCard?.clock_in || todayCard?.clock_out ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md active:scale-95'}`}>
                {todayCard?.clock_out ? `退勤済み ${format(new Date(todayCard.clock_out), 'HH:mm')}` : '🔵 退勤'}
              </button>
            </div>

            {gpsStatus && (
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mb-2">
                <MapPin size={12} />{gpsStatus}
              </div>
            )}

            {todayCard?.clock_in && todayCard?.clock_out && (
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-green-700 font-bold text-lg">{calcWorkTime(todayCard)}</p>
                <p className="text-green-600 text-xs">本日の勤務時間</p>
              </div>
            )}

            {/* 今日の打刻に間違いがあれば修正 */}
            {todayCard && (
              <button onClick={() => openEdit(todayCard)}
                className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-amber-600 border border-amber-300 rounded-xl py-2 hover:bg-amber-50 transition-colors">
                <Pencil size={14} />打刻時刻を修正する
              </button>
            )}
          </div>
        </div>
      )}

      {/* 日報タブ */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">{format(new Date(), 'M月d日（E）', { locale: ja })} の日報</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">天気</label>
                <select value={weather} onChange={e => setWeather(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">選択</option>
                  <option value="晴れ">☀️ 晴れ</option>
                  <option value="曇り">☁️ 曇り</option>
                  <option value="雨">🌧️ 雨</option>
                  <option value="雪">❄️ 雪</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">参加者数</label>
                <input type="number" value={participants} onChange={e => setParticipants(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="人数" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">活動内容・報告</label>
              <textarea rows={6} value={report} onChange={e => { setReport(e.target.value); setReportSaved(false) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="本日の活動内容、特記事項などを入力..." />
            </div>
            <button onClick={saveReport} disabled={!report.trim()} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-40">
              {reportSaved ? <span className="flex items-center justify-center gap-2"><CheckCircle2 size={18} />保存済み</span> : '日報を保存'}
            </button>
          </div>
        </div>
      )}

      {/* 修正・履歴タブ */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">打刻を間違えた場合は鉛筆マークから修正できます。修正理由を必ず入力してください。</p>
          </div>

          {/* 月切り替え */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
              <h2 className="font-bold text-gray-800">{format(viewMonth, 'yyyy年M月', { locale: ja })}</h2>
              <button onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                <ChevronRight size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const card = monthCards.find(c => c.date === dateStr)
                if (!card) return null
                const dow = getDay(day)
                return (
                  <div key={dateStr} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-12 text-center">
                      <p className={`font-bold text-sm ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                        {format(day, 'M/d')}
                      </p>
                      <p className="text-xs text-gray-400">{format(day, 'E', { locale: ja })}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-600 font-medium">
                          出勤 {card.clock_in ? format(new Date(card.clock_in), 'HH:mm') : '--:--'}
                        </span>
                        <span className="text-blue-600 font-medium">
                          退勤 {card.clock_out ? format(new Date(card.clock_out), 'HH:mm') : '--:--'}
                        </span>
                      </div>
                      {card.clock_in && card.clock_out && (
                        <p className="text-xs text-gray-400 mt-0.5">{calcWorkTime(card)}</p>
                      )}
                      {card.note && (
                        <p className="text-xs text-amber-600 mt-0.5">📝 {card.note}</p>
                      )}
                    </div>
                    <button onClick={() => openEdit(card)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-colors">
                      <Pencil size={14} className="text-gray-400" />
                    </button>
                  </div>
                )
              }).filter(Boolean)}

              {monthCards.length === 0 && (
                <p className="text-center text-gray-400 py-4">この月の打刻データはありません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 管理者タブ */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-700">{format(new Date(), 'M月d日（E）', { locale: ja })} のスタッフ勤怠</h2>
          {allStaffCards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">本日の打刻データはありません</div>
          ) : (
            allStaffCards.map((card: any) => (
              <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{card.profiles?.full_name ?? '不明'}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {card.clock_in && <span className="text-green-600">出勤 {format(new Date(card.clock_in), 'HH:mm')}</span>}
                      {card.clock_out && <span className="text-blue-600">退勤 {format(new Date(card.clock_out), 'HH:mm')}</span>}
                    </div>
                    {card.note && <p className="text-xs text-amber-600 mt-0.5">📝 {card.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {card.clock_in && card.clock_out ? (
                        <span className="bg-blue-50 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">{calcWorkTime(card)}</span>
                      ) : card.clock_in ? (
                        <span className="bg-green-50 text-green-700 text-sm font-bold px-3 py-1 rounded-full">勤務中</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-400 text-sm px-3 py-1 rounded-full">未打刻</span>
                      )}
                    </div>
                    <button onClick={() => openEdit(card)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-300">
                      <Pencil size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 打刻修正モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => !editSaving && setEditTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            {editDone ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                <p className="font-bold text-gray-900">修正しました</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">打刻を修正</h3>
                  <button onClick={() => setEditTarget(null)}><X size={20} className="text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {format(parseISO(editTarget.date), 'M月d日（E）', { locale: ja })}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">🟢 出勤時刻</label>
                    <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)}
                      className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">🔵 退勤時刻</label>
                    <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)}
                      className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">修正理由（必須）</label>
                    <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="例：打刻忘れ、時刻ミスなど" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setEditTarget(null)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm text-gray-600">キャンセル</button>
                  <button onClick={saveEdit} disabled={editSaving || !editNote.trim()}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-40">
                    {editSaving ? '保存中...' : '修正を保存'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
