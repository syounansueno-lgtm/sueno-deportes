'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trophy, Plus, X, Trash2, MapPin, Pencil, Check, Image } from 'lucide-react'
import Link from 'next/link'
import type { Sport } from '@/types'
import { SPORT_LABELS, SPORT_COLORS } from '@/types'

type Match = {
  id: string
  sport: Sport
  opponent: string
  match_date: string
  location: string | null
  score_us: number | null
  score_them: number | null
  result: 'win' | 'lose' | 'draw' | null
  notes: string | null
}

type FormState = {
  sport: Sport
  opponent: string
  match_date: string
  location: string
  score_us: string
  score_them: string
  result: 'win' | 'lose' | 'draw' | ''
  notes: string
}

const SPORTS: Sport[] = ['soccer', 'karate', 'pickleball', 'gymnastics']
const RESULT_LABELS = { win: '勝利', lose: '敗北', draw: '引き分け' }
const RESULT_STYLES = {
  win: 'bg-green-100 text-green-700 border-green-200',
  lose: 'bg-red-100 text-red-700 border-red-200',
  draw: 'bg-gray-100 text-gray-600 border-gray-200',
}
const EMPTY_FORM: FormState = { sport: 'soccer', opponent: '', match_date: '', location: '', score_us: '', score_them: '', result: '', notes: '' }

function MatchForm({
  title, form, setForm, onSubmit, onCancel, submitting
}: {
  title: string
  form: FormState
  setForm: (f: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitting: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border-2 border-green-400 p-5 mb-4 shadow-sm">
      <h2 className="font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">競技</label>
          <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value as Sport })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {SPORTS.map(s => <option key={s} value={s}>{SPORT_LABELS[s].split('（')[0]}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">相手チーム <span className="text-red-500">*</span></label>
          <input required value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="FC 相模原" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">試合日 <span className="text-red-500">*</span></label>
          <input type="date" required value={form.match_date} onChange={e => setForm({ ...form, match_date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">自チーム得点</label>
          <input type="number" min="0" value={form.score_us} onChange={e => setForm({ ...form, score_us: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="2" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">相手得点</label>
          <input type="number" min="0" value={form.score_them} onChange={e => setForm({ ...form, score_them: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">結果</label>
          <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value as any })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">未選択</option>
            <option value="win">勝利</option>
            <option value="draw">引き分け</option>
            <option value="lose">敗北</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">会場</label>
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="相模原ギオンスタジアム" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">試合内容・コメント</label>
          <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder="試合の流れ、良かった点、課題など..." />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={submitting || !form.opponent || !form.match_date}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
          {submitting ? '保存中...' : '保存する'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">
          キャンセル
        </button>
      </div>
    </form>
  )
}

export default function MatchesPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<Match[]>([])
  const [photoCount, setPhotoCount] = useState<Record<string, number>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterSport, setFilterSport] = useState<Sport | 'all'>('all')

  // 追加フォーム
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 編集フォーム
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, matchesRes, photosRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
        supabase.from('photos').select('match_id').not('match_id', 'is', null),
      ])
      setIsAdmin(['admin', 'staff'].includes(profileRes.data?.role ?? ''))
      setMatches(matchesRes.data ?? [])
      const counts: Record<string, number> = {}
      for (const p of photosRes.data ?? []) {
        if (p.match_id) counts[p.match_id] = (counts[p.match_id] ?? 0) + 1
      }
      setPhotoCount(counts)
      setLoading(false)
    }
    load()
  }, [])

  // 追加
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      sport: form.sport,
      opponent: form.opponent.trim(),
      match_date: form.match_date,
      location: form.location.trim() || null,
      score_us: form.score_us !== '' ? parseInt(form.score_us) : null,
      score_them: form.score_them !== '' ? parseInt(form.score_them) : null,
      result: form.result || null,
      notes: form.notes.trim() || null,
    }
    const { data, error } = await supabase.from('matches').insert(payload).select().single()
    if (!error && data) {
      setMatches(prev => [data, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
    }
    setSubmitting(false)
  }

  // 編集開始
  function startEdit(match: Match) {
    setEditingId(match.id)
    setEditForm({
      sport: match.sport,
      opponent: match.opponent,
      match_date: match.match_date,
      location: match.location ?? '',
      score_us: match.score_us?.toString() ?? '',
      score_them: match.score_them?.toString() ?? '',
      result: match.result ?? '',
      notes: match.notes ?? '',
    })
    setShowForm(false)
  }

  // 編集保存
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setSavingEdit(true)
    const payload = {
      sport: editForm.sport,
      opponent: editForm.opponent.trim(),
      match_date: editForm.match_date,
      location: editForm.location.trim() || null,
      score_us: editForm.score_us !== '' ? parseInt(editForm.score_us) : null,
      score_them: editForm.score_them !== '' ? parseInt(editForm.score_them) : null,
      result: editForm.result || null,
      notes: editForm.notes.trim() || null,
    }
    const { data, error } = await supabase.from('matches').update(payload).eq('id', editingId).select().single()
    if (!error && data) {
      setMatches(prev => prev.map(m => m.id === editingId ? data : m))
      setEditingId(null)
    }
    setSavingEdit(false)
  }

  // 削除
  async function handleDelete(matchId: string) {
    if (!window.confirm('この試合記録を削除しますか？')) return
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (!error) setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  const filtered = filterSport === 'all' ? matches : matches.filter(m => m.sport === filterSport)
  const wins = matches.filter(m => m.result === 'win').length
  const loses = matches.filter(m => m.result === 'lose').length
  const draws = matches.filter(m => m.result === 'draw').length

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">試合結果</h1>
          <p className="text-sm text-gray-500 mt-0.5">試合記録・スコア管理</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null) }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'キャンセル' : '試合を追加'}
          </button>
        )}
      </div>

      {/* サマリー */}
      {matches.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{wins}</p>
            <p className="text-xs text-green-600 mt-0.5">勝利</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{draws}</p>
            <p className="text-xs text-gray-500 mt-0.5">引き分け</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{loses}</p>
            <p className="text-xs text-red-500 mt-0.5">敗北</p>
          </div>
        </div>
      )}

      {/* 追加フォーム */}
      {showForm && isAdmin && (
        <MatchForm title="試合を記録する" form={form} setForm={setForm}
          onSubmit={handleAdd} onCancel={() => setShowForm(false)} submitting={submitting} />
      )}

      {/* スポーツフィルター */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...SPORTS] as const).map(s => (
          <button key={s} onClick={() => setFilterSport(s as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterSport === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s === 'all' ? 'すべて' : SPORT_LABELS[s as Sport].split('（')[0]}
          </button>
        ))}
      </div>

      {/* 試合一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Trophy size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">試合記録はまだありません</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">「試合を追加」から記録してください</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(match => {
            const hasScore = match.score_us !== null && match.score_them !== null
            const pCount = photoCount[match.id] ?? 0
            const isEditing = editingId === match.id

            return (
              <div key={match.id}>
                {/* 編集フォーム */}
                {isEditing && isAdmin ? (
                  <MatchForm title="試合を編集する" form={editForm} setForm={setEditForm}
                    onSubmit={handleEdit} onCancel={() => setEditingId(null)} submitting={savingEdit} />
                ) : (
                  /* 通常表示 */
                  <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
                    {/* カード本体 → 詳細ページへ */}
                    <Link href={`/dashboard/matches/${match.id}`} className="block p-4">
                      {/* スポーツバッジ + 日付 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SPORT_COLORS[match.sport]}`}>
                          {SPORT_LABELS[match.sport].split('（')[0]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(match.match_date), 'yyyy年M月d日（E）', { locale: ja })}
                        </span>
                      </div>

                      {/* 対戦相手 + スコア + 結果 */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-bold text-gray-900">vs {match.opponent}</span>
                        {hasScore && (
                          <span className="bg-gray-800 text-white text-sm font-bold px-3 py-1 rounded-lg">
                            {match.score_us} - {match.score_them}
                          </span>
                        )}
                        {match.result && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${RESULT_STYLES[match.result]}`}>
                            {RESULT_LABELS[match.result]}
                          </span>
                        )}
                      </div>

                      {/* 場所・コメント・写真数 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {match.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} /> {match.location}
                          </span>
                        )}
                        {match.notes && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            💬 {match.notes.length > 30 ? match.notes.slice(0, 30) + '…' : match.notes}
                          </span>
                        )}
                        {pCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <Image size={11} /> 写真 {pCount}枚
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-green-600 font-medium mt-2">タップして詳細・選手コメントを見る →</p>
                    </Link>

                    {/* 編集・削除ボタン */}
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1 px-4 pb-3 -mt-1">
                        <button onClick={() => startEdit(match)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
                          <Pencil size={13} /> 編集
                        </button>
                        <button onClick={() => handleDelete(match.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                          <Trash2 size={13} /> 削除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
