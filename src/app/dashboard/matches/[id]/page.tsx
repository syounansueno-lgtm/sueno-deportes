'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, Star, Plus, Check, X, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import type { Player, MatchPlayerEvaluation } from '@/types'

type Match = {
  id: string
  opponent: string
  match_date: string
  location: string | null
  score_us: number | null
  score_them: number | null
  result: 'win' | 'lose' | 'draw' | null
  notes: string | null
}

const RESULT_LABELS = { win: '勝利', lose: '敗北', draw: '引き分け' }
const RESULT_STYLES = {
  win: 'bg-green-100 text-green-700',
  lose: 'bg-red-100 text-red-700',
  draw: 'bg-gray-100 text-gray-600',
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !readonly && onChange?.(n)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        >
          <Star
            size={readonly ? 16 : 24}
            className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  )
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [evaluations, setEvaluations] = useState<MatchPlayerEvaluation[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // 評価フォーム
  const [showForm, setShowForm] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [rating, setRating] = useState(3)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 検索
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, matchRes, playersRes, evalsRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('matches').select('*').eq('id', id).single(),
        supabase.from('players').select('*').eq('active', true).order('number', { nullsFirst: false }).order('name'),
        supabase.from('match_player_evaluations').select('*').eq('match_id', id),
      ])
      setIsAdmin(['admin', 'staff'].includes(profileRes.data?.role ?? ''))
      setMatch(matchRes.data)
      setPlayers(playersRes.data ?? [])
      setEvaluations(evalsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlayer) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    // upsert（同じ試合×選手は上書き）
    const { data } = await supabase.from('match_player_evaluations')
      .upsert({
        match_id: id,
        player_id: selectedPlayer,
        rating,
        comment: comment.trim() || null,
        created_by: user!.id,
      }, { onConflict: 'match_id,player_id' })
      .select().single()

    if (data) {
      setEvaluations(prev => {
        const exists = prev.find(e => e.player_id === selectedPlayer)
        return exists ? prev.map(e => e.player_id === selectedPlayer ? data : e) : [...prev, data]
      })
      setSelectedPlayer('')
      setRating(3)
      setComment('')
      setShowForm(false)
    }
    setSubmitting(false)
  }

  async function deleteEval(evalId: string) {
    if (!window.confirm('この評価を削除しますか？')) return
    await supabase.from('match_player_evaluations').delete().eq('id', evalId)
    setEvaluations(prev => prev.filter(e => e.id !== evalId))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>
  if (!match) return <div className="p-8 text-center text-gray-500">試合が見つかりません</div>

  const hasScore = match.score_us !== null && match.score_them !== null

  // 評価済み選手
  const evaluatedPlayerIds = new Set(evaluations.map(e => e.player_id))
  // 未評価選手
  const unevaluatedPlayers = players.filter(p => !evaluatedPlayerIds.has(p.id))

  // 評価一覧（検索）
  const filteredEvals = evaluations.filter(ev => {
    const p = players.find(pl => pl.id === ev.player_id)
    return !search || p?.name.includes(search) || p?.number?.includes(search)
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/matches" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={16} /> 試合一覧に戻る
      </Link>

      {/* 試合情報 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <p className="text-xs text-gray-400 mb-1">{format(new Date(match.match_date), 'yyyy年M月d日（E）', { locale: ja })}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">vs {match.opponent}</h1>
          {hasScore && (
            <span className="bg-gray-800 text-white font-bold px-3 py-1 rounded-lg text-sm">
              {match.score_us} - {match.score_them}
            </span>
          )}
          {match.result && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${RESULT_STYLES[match.result]}`}>
              {RESULT_LABELS[match.result]}
            </span>
          )}
        </div>
        {match.location && <p className="text-xs text-gray-400 mt-1">📍 {match.location}</p>}
        {match.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl px-4 py-2">{match.notes}</p>}
      </div>

      {/* 選手へのコメントヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-green-600" />
            選手へのコメント
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{evaluations.length}名評価済み・{unevaluatedPlayers.length}名未評価</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'キャンセル' : '評価を追加'}
          </button>
        )}
      </div>

      {/* 評価フォーム */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-green-400 p-5 mb-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">選手を評価する</h3>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 block mb-1">選手 <span className="text-red-500">*</span></label>
            <select
              required
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">選手を選んでください</option>
              {/* 未評価 */}
              {unevaluatedPlayers.length > 0 && (
                <optgroup label="未評価">
                  {unevaluatedPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ''}{p.name}{p.position ? ` (${p.position})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* 評価済み（上書き可能） */}
              {players.filter(p => evaluatedPlayerIds.has(p.id)).length > 0 && (
                <optgroup label="評価済み（上書き）">
                  {players.filter(p => evaluatedPlayerIds.has(p.id)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ''}{p.name}{p.position ? ` (${p.position})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 block mb-2">評価</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 block mb-1">コメント</label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="試合でのプレーについてコメント..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedPlayer}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40"
          >
            {submitting ? '保存中...' : '評価を保存'}
          </button>
        </form>
      )}

      {/* 評価一覧 */}
      {evaluations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Star size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">まだ評価がありません</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">「評価を追加」から選手を評価してください</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvals.map(ev => {
            const player = players.find(p => p.id === ev.player_id)
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-700 text-sm">
                      {player?.number ?? player?.name.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{player?.name ?? '不明'}</p>
                      <div className="mt-1">
                        <StarRating value={ev.rating ?? 0} readonly />
                      </div>
                      {ev.comment && (
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{ev.comment}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteEval(ev.id)} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 未評価選手リスト */}
      {isAdmin && unevaluatedPlayers.length > 0 && evaluations.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">未評価の選手（{unevaluatedPlayers.length}名）</p>
          <div className="flex flex-wrap gap-2">
            {unevaluatedPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlayer(p.id); setShowForm(true) }}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors"
              >
                {p.number ? `#${p.number} ` : ''}{p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
