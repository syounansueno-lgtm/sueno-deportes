'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  ArrowLeft, Target, MessageSquare, Dumbbell, Plus, Pencil,
  Check, X, Trash2, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import type { Player, PlayerGoal, PlayerComment, PlayerPhysicalLog, PhysicalCheckItem, PlayerPhysicalCheck } from '@/types'

type Match = { id: string; opponent: string; match_date: string }

const SEMESTER_LABELS = { annual: '年間目標', first: '前期目標', second: '後期目標' }
const SEMESTER_ORDER: Array<'annual' | 'first' | 'second'> = ['annual', 'first', 'second']

export default function PlayerNotebookPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [player, setPlayer] = useState<Player | null>(null)
  const [goals, setGoals] = useState<PlayerGoal[]>([])
  const [comments, setComments] = useState<PlayerComment[]>([])
  const [physicalLogs, setPhysicalLogs] = useState<PlayerPhysicalLog[]>([])
  const [checkItems, setCheckItems] = useState<PhysicalCheckItem[]>([])
  const [playerChecks, setPlayerChecks] = useState<PlayerPhysicalCheck[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // 目標編集
  const [editingGoal, setEditingGoal] = useState<'annual' | 'first' | 'second' | null>(null)
  const [goalText, setGoalText] = useState('')

  // コメントフォーム
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentForm, setCommentForm] = useState({ comment: '', match_id: '' })
  const [submittingComment, setSubmittingComment] = useState(false)

  // フィジカルログフォーム
  const [showPhysicalForm, setShowPhysicalForm] = useState(false)
  const [physicalForm, setPhysicalForm] = useState({
    log_date: format(new Date(), 'yyyy-MM-dd'), menu: '', distance_km: '', notes: ''
  })
  const [submittingPhysical, setSubmittingPhysical] = useState(false)

  // チェック項目追加
  const [newItemLabel, setNewItemLabel] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)

  // チェックコメント編集
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null)
  const [checkComment, setCheckComment] = useState('')

  // セクション開閉
  const [openSections, setOpenSections] = useState({
    goals: true, checks: true, comments: true, physical: true
  })
  const toggleSection = (s: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }))

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, playerRes, goalsRes, commentsRes, physicalRes, matchesRes, itemsRes, checksRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('players').select('*').eq('id', id).single(),
        supabase.from('player_goals').select('*').eq('player_id', id).eq('year', currentYear),
        supabase.from('player_comments').select('*').eq('player_id', id).order('created_at', { ascending: false }),
        supabase.from('player_physical_logs').select('*').eq('player_id', id).order('log_date', { ascending: false }),
        supabase.from('matches').select('id, opponent, match_date').order('match_date', { ascending: false }).limit(30),
        supabase.from('physical_check_items').select('*').order('sort_order').order('created_at'),
        supabase.from('player_physical_checks').select('*').eq('player_id', id),
      ])

      setIsAdmin(['admin', 'staff'].includes(profileRes.data?.role ?? ''))
      setPlayer(playerRes.data)
      setGoals(goalsRes.data ?? [])
      setComments(commentsRes.data ?? [])
      setPhysicalLogs(physicalRes.data ?? [])
      setMatches(matchesRes.data ?? [])
      setCheckItems(itemsRes.data ?? [])
      setPlayerChecks(checksRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  // ===== 目標 =====
  async function saveGoal(semester: 'annual' | 'first' | 'second') {
    if (!goalText.trim()) return
    const existing = goals.find(g => g.semester === semester)
    if (existing) {
      const { data } = await supabase.from('player_goals')
        .update({ content: goalText.trim(), updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single()
      if (data) setGoals(prev => prev.map(g => g.id === existing.id ? data : g))
    } else {
      const { data } = await supabase.from('player_goals')
        .insert({ player_id: id, year: currentYear, semester, content: goalText.trim() })
        .select().single()
      if (data) setGoals(prev => [...prev, data])
    }
    setEditingGoal(null)
    setGoalText('')
  }

  // ===== フィジカルチェック =====
  async function toggleCheck(item: PhysicalCheckItem) {
    const existing = playerChecks.find(c => c.item_id === item.id)
    if (existing) {
      // すでにある → checked を反転
      const { data } = await supabase.from('player_physical_checks')
        .update({ checked: !existing.checked, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single()
      if (data) setPlayerChecks(prev => prev.map(c => c.id === existing.id ? data : c))
    } else {
      // 新規チェック
      const { data } = await supabase.from('player_physical_checks')
        .insert({ player_id: id, item_id: item.id, checked: true })
        .select().single()
      if (data) setPlayerChecks(prev => [...prev, data])
    }
  }

  async function saveCheckComment(itemId: string) {
    const existing = playerChecks.find(c => c.item_id === itemId)
    if (existing) {
      const { data } = await supabase.from('player_physical_checks')
        .update({ comment: checkComment.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single()
      if (data) setPlayerChecks(prev => prev.map(c => c.id === existing.id ? data : c))
    } else {
      // チェックなしでコメントだけ保存する場合は checked=false で作る
      const { data } = await supabase.from('player_physical_checks')
        .insert({ player_id: id, item_id: itemId, checked: false, comment: checkComment.trim() || null })
        .select().single()
      if (data) setPlayerChecks(prev => [...prev, data])
    }
    setEditingCheckId(null)
    setCheckComment('')
  }

  async function addCheckItem() {
    if (!newItemLabel.trim()) return
    setAddingItem(true)
    const { data } = await supabase.from('physical_check_items')
      .insert({ label: newItemLabel.trim(), sort_order: checkItems.length + 1 })
      .select().single()
    if (data) {
      setCheckItems(prev => [...prev, data])
      setNewItemLabel('')
      setShowAddItem(false)
    }
    setAddingItem(false)
  }

  async function deleteCheckItem(itemId: string) {
    if (!window.confirm('この項目を全選手から削除しますか？')) return
    await supabase.from('physical_check_items').delete().eq('id', itemId)
    setCheckItems(prev => prev.filter(i => i.id !== itemId))
    setPlayerChecks(prev => prev.filter(c => c.item_id !== itemId))
  }

  // ===== コーチコメント =====
  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentForm.comment.trim()) return
    setSubmittingComment(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('player_comments')
      .insert({
        player_id: id,
        comment: commentForm.comment.trim(),
        match_id: commentForm.match_id || null,
        created_by: user!.id,
      }).select().single()
    if (data) {
      setComments(prev => [data, ...prev])
      setCommentForm({ comment: '', match_id: '' })
      setShowCommentForm(false)
    }
    setSubmittingComment(false)
  }

  async function deleteComment(cid: string) {
    if (!window.confirm('このコメントを削除しますか？')) return
    await supabase.from('player_comments').delete().eq('id', cid)
    setComments(prev => prev.filter(c => c.id !== cid))
  }

  // ===== フィジカルログ =====
  async function addPhysical(e: React.FormEvent) {
    e.preventDefault()
    if (!physicalForm.menu.trim() && !physicalForm.distance_km) return
    setSubmittingPhysical(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('player_physical_logs')
      .insert({
        player_id: id,
        log_date: physicalForm.log_date,
        menu: physicalForm.menu.trim() || null,
        distance_km: physicalForm.distance_km ? parseFloat(physicalForm.distance_km) : null,
        notes: physicalForm.notes.trim() || null,
        created_by: user!.id,
      }).select().single()
    if (data) {
      setPhysicalLogs(prev => [data, ...prev].sort((a, b) => b.log_date.localeCompare(a.log_date)))
      setPhysicalForm({ log_date: format(new Date(), 'yyyy-MM-dd'), menu: '', distance_km: '', notes: '' })
      setShowPhysicalForm(false)
    }
    setSubmittingPhysical(false)
  }

  async function deletePhysical(lid: string) {
    if (!window.confirm('このログを削除しますか？')) return
    await supabase.from('player_physical_logs').delete().eq('id', lid)
    setPhysicalLogs(prev => prev.filter(l => l.id !== lid))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>
  if (!player) return <div className="p-8 text-center text-gray-500">選手が見つかりません</div>

  const checkedCount = playerChecks.filter(c => c.checked).length

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/players" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={16} /> 選手一覧に戻る
      </Link>

      {/* 選手ヘッダー */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 mb-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {player.number ?? player.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{player.name}</h1>
            <p className="text-green-100 text-sm mt-0.5">
              {[player.number ? `#${player.number}` : null, player.position].filter(Boolean).join(' · ') || 'ヴェルディ相模原'}
            </p>
          </div>
          {checkedCount > 0 && (
            <div className="bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={12} />
              強化 {checkedCount}項目
            </div>
          )}
        </div>
      </div>

      {/* ===== 目標設定 ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('goals')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Target size={18} className="text-green-600" />
            目標設定 — {currentYear}年
          </div>
          {openSections.goals ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {openSections.goals && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            {SEMESTER_ORDER.map(semester => {
              const goal = goals.find(g => g.semester === semester)
              const isEditing = editingGoal === semester
              return (
                <div key={semester}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-gray-700">{SEMESTER_LABELS[semester]}</p>
                    {isAdmin && !isEditing && (
                      <button
                        onClick={() => { setEditingGoal(semester); setGoalText(goal?.content ?? '') }}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Pencil size={12} /> {goal ? '編集' : '入力'}
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <textarea
                        autoFocus
                        rows={2}
                        value={goalText}
                        onChange={e => setGoalText(e.target.value)}
                        className="flex-1 border border-green-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        placeholder="目標を入力..."
                      />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => saveGoal(semester)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Check size={16} /></button>
                        <button onClick={() => setEditingGoal(null)} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                      </div>
                    </div>
                  ) : goal ? (
                    <p className="text-sm text-gray-700 bg-green-50 rounded-xl px-4 py-3 leading-relaxed">{goal.content}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 rounded-xl px-4 py-3">未設定</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== フィジカル強化チェック ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('checks')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <AlertTriangle size={18} className="text-red-500" />
            フィジカル強化ポイント
            {checkedCount > 0 && (
              <span className="text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{checkedCount}項目 要強化</span>
            )}
          </div>
          {openSections.checks ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {openSections.checks && (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="text-xs text-gray-400 mb-3">チェックした項目が「要強化」として記録されます</p>

            <div className="space-y-2 mb-4">
              {checkItems.map(item => {
                const pc = playerChecks.find(c => c.item_id === item.id)
                const isChecked = pc?.checked ?? false
                const isEditingThis = editingCheckId === item.id

                return (
                  <div key={item.id} className={`rounded-xl border-2 transition-colors ${
                    isChecked ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* チェックボックス */}
                      {isAdmin ? (
                        <button
                          onClick={() => toggleCheck(item)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'border-gray-300 bg-white hover:border-red-400'
                          }`}
                        >
                          {isChecked && <Check size={14} />}
                        </button>
                      ) : (
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          isChecked ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isChecked && <Check size={14} />}
                        </div>
                      )}

                      <span className={`flex-1 text-sm font-medium ${isChecked ? 'text-red-700' : 'text-gray-600'}`}>
                        {item.label}
                      </span>

                      {/* コメント編集 */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingCheckId(item.id)
                            setCheckComment(pc?.comment ?? '')
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 flex-shrink-0"
                        >
                          <Pencil size={12} />
                          {pc?.comment ? 'メモ編集' : 'メモ追加'}
                        </button>
                      )}

                      {/* 項目削除（管理者のみ） */}
                      {isAdmin && (
                        <button
                          onClick={() => deleteCheckItem(item.id)}
                          className="text-gray-300 hover:text-red-400 p-0.5 flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* コメント表示 */}
                    {pc?.comment && !isEditingThis && (
                      <p className="text-xs text-gray-500 px-4 pb-3 -mt-1 leading-relaxed">
                        💬 {pc.comment}
                      </p>
                    )}

                    {/* コメント編集フォーム */}
                    {isEditingThis && (
                      <div className="px-4 pb-3 flex gap-2">
                        <input
                          autoFocus
                          value={checkComment}
                          onChange={e => setCheckComment(e.target.value)}
                          placeholder="具体的なメモを入力..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                        />
                        <button
                          onClick={() => saveCheckComment(item.id)}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingCheckId(null)}
                          className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 項目追加（管理者のみ） */}
            {isAdmin && (
              showAddItem ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
                    placeholder="新しい項目名を入力..."
                    className="flex-1 border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                  <button
                    onClick={addCheckItem}
                    disabled={addingItem || !newItemLabel.trim()}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setShowAddItem(false); setNewItemLabel('') }}
                    className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 px-4 py-2.5 rounded-xl w-full transition-colors"
                >
                  <Plus size={15} /> チェック項目を追加
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ===== コーチコメント ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('comments')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <MessageSquare size={18} className="text-blue-500" />
            コーチコメント
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comments.length}</span>
          </div>
          {openSections.comments ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {openSections.comments && (
          <div className="border-t border-gray-100">
            {isAdmin && (
              <div className="px-5 pt-4 pb-2">
                {showCommentForm ? (
                  <form onSubmit={addComment} className="bg-blue-50 rounded-xl p-4">
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-600 block mb-1">試合（任意）</label>
                      <select
                        value={commentForm.match_id}
                        onChange={e => setCommentForm(f => ({ ...f, match_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">試合に紐付けない</option>
                        {matches.map(m => (
                          <option key={m.id} value={m.id}>
                            {format(new Date(m.match_date), 'M/d', { locale: ja })} vs {m.opponent}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      required
                      value={commentForm.comment}
                      onChange={e => setCommentForm(f => ({ ...f, comment: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                      placeholder="コメントを入力..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-40"
                      >
                        {submittingComment ? '保存中...' : '保存する'}
                      </button>
                      <button type="button" onClick={() => setShowCommentForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                        キャンセル
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowCommentForm(true)}
                    className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl w-full transition-colors"
                  >
                    <Plus size={16} /> コメントを追加
                  </button>
                )}
              </div>
            )}

            <div className="divide-y divide-gray-100 px-5 py-2">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">コメントはまだありません</p>
              ) : (
                comments.map(c => {
                  const relatedMatch = matches.find(m => m.id === c.match_id)
                  return (
                    <div key={c.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {relatedMatch && (
                            <p className="text-xs text-blue-500 font-medium mb-1">
                              vs {relatedMatch.opponent} ({format(new Date(relatedMatch.match_date), 'M/d', { locale: ja })})
                            </p>
                          )}
                          <p className="text-sm text-gray-800 leading-relaxed">{c.comment}</p>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {format(new Date(c.created_at), 'yyyy/M/d HH:mm', { locale: ja })}
                          </p>
                        </div>
                        {isAdmin && (
                          <button onClick={() => deleteComment(c.id)} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== フィジカルログ ===== */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('physical')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Dumbbell size={18} className="text-orange-500" />
            フィジカル・トレーニングログ
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{physicalLogs.length}</span>
          </div>
          {openSections.physical ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {openSections.physical && (
          <div className="border-t border-gray-100">
            {isAdmin && (
              <div className="px-5 pt-4 pb-2">
                {showPhysicalForm ? (
                  <form onSubmit={addPhysical} className="bg-orange-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">日付</label>
                        <input
                          type="date"
                          value={physicalForm.log_date}
                          onChange={e => setPhysicalForm(f => ({ ...f, log_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">ランニング (km)</label>
                        <input
                          type="number" min="0" step="0.1"
                          value={physicalForm.distance_km}
                          onChange={e => setPhysicalForm(f => ({ ...f, distance_km: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          placeholder="5.0"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-600 block mb-1">トレーニングメニュー</label>
                      <input
                        value={physicalForm.menu}
                        onChange={e => setPhysicalForm(f => ({ ...f, menu: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        placeholder="体幹トレ・ダッシュ10本..."
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-600 block mb-1">メモ</label>
                      <textarea
                        rows={2}
                        value={physicalForm.notes}
                        onChange={e => setPhysicalForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white resize-none"
                        placeholder="調子・気づきなど..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingPhysical || (!physicalForm.menu.trim() && !physicalForm.distance_km)}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-40"
                      >
                        {submittingPhysical ? '保存中...' : '記録する'}
                      </button>
                      <button type="button" onClick={() => setShowPhysicalForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                        キャンセル
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowPhysicalForm(true)}
                    className="flex items-center gap-2 text-sm text-orange-600 font-medium hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2.5 rounded-xl w-full transition-colors"
                  >
                    <Plus size={16} /> トレーニングを記録
                  </button>
                )}
              </div>
            )}

            <div className="divide-y divide-gray-100 px-5 py-2">
              {physicalLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">記録はまだありません</p>
              ) : (
                physicalLogs.map(log => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="bg-orange-100 rounded-lg px-2 py-1 text-center min-w-[48px] flex-shrink-0">
                        <p className="text-xs font-bold text-orange-700">{format(new Date(log.log_date), 'M/d')}</p>
                        <p className="text-xs text-orange-500">{format(new Date(log.log_date), 'E', { locale: ja })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        {log.distance_km && <p className="text-sm font-semibold text-gray-800">🏃 {log.distance_km}km</p>}
                        {log.menu && <p className="text-sm text-gray-700">{log.menu}</p>}
                        {log.notes && <p className="text-xs text-gray-400 mt-0.5">{log.notes}</p>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deletePhysical(log.id)} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
