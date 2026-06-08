'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, Plus, X, Search, ChevronRight, Pencil, Trash2, Check } from 'lucide-react'
import type { Player } from '@/types'

export default function PlayersPage() {
  const supabase = createClient()
  const [players, setPlayers] = useState<Player[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 追加フォーム
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '' })
  const [submitting, setSubmitting] = useState(false)

  // 編集
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', number: '', position: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, playersRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('players').select('*').eq('active', true).order('number', { ascending: true, nullsFirst: false }).order('name'),
      ])
      setIsAdmin(['admin', 'staff'].includes(profileRes.data?.role ?? ''))
      setPlayers(playersRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function sortPlayers(list: Player[]) {
    return [...list].sort((a, b) => {
      const na = parseInt(a.number ?? '999'), nb = parseInt(b.number ?? '999')
      return na - nb || a.name.localeCompare(b.name)
    })
  }

  // 追加
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('players')
      .insert({ name: form.name.trim(), number: form.number.trim() || null, position: form.position.trim() || null, sport: 'soccer' })
      .select().single()
    if (!error && data) {
      setPlayers(prev => sortPlayers([...prev, data]))
      setForm({ name: '', number: '', position: '' })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  // 編集開始
  function startEdit(player: Player) {
    setEditingId(player.id)
    setEditForm({ name: player.name, number: player.number ?? '', position: player.position ?? '' })
  }

  // 編集保存
  async function saveEdit(playerId: string) {
    if (!editForm.name.trim()) return
    setSavingEdit(true)
    const { data, error } = await supabase
      .from('players')
      .update({ name: editForm.name.trim(), number: editForm.number.trim() || null, position: editForm.position.trim() || null })
      .eq('id', playerId).select().single()
    if (!error && data) {
      setPlayers(prev => sortPlayers(prev.map(p => p.id === playerId ? data : p)))
      setEditingId(null)
    }
    setSavingEdit(false)
  }

  // 削除
  async function handleDelete(player: Player) {
    if (!window.confirm(`「${player.name}」を削除しますか？\n関連するデータも全て削除されます。`)) return
    await supabase.from('players').delete().eq('id', player.id)
    setPlayers(prev => prev.filter(p => p.id !== player.id))
  }

  const filtered = players.filter(p =>
    p.name.includes(search) ||
    (p.number && p.number.includes(search)) ||
    (p.position && p.position.includes(search))
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">選手一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">{players.length}名登録</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null) }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'キャンセル' : '選手追加'}
          </button>
        )}
      </div>

      {/* 追加フォーム */}
      {showForm && isAdmin && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border-2 border-green-400 p-5 mb-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">選手を追加</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">背番号</label>
              <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="10" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">名前 <span className="text-red-500">*</span></label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="山田 太郎" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">ポジション</label>
              <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="FW" />
            </div>
          </div>
          <button type="submit" disabled={submitting || !form.name.trim()}
            className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
            {submitting ? '追加中...' : '追加する'}
          </button>
        </form>
      )}

      {/* 検索 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="名前・番号・ポジションで検索"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
      </div>

      {/* 選手一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search ? '該当する選手が見つかりません' : '選手が登録されていません'}</p>
          {isAdmin && !search && <p className="text-sm text-gray-400 mt-1">「選手追加」から登録してください</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.map((player, i) => (
            <div key={player.id} className={i < filtered.length - 1 ? 'border-b border-gray-100' : ''}>

              {/* 編集モード */}
              {editingId === player.id ? (
                <div className="px-4 py-3 bg-green-50">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-0.5">背番号</label>
                      <input value={editForm.number} onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-0.5">名前 *</label>
                      <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-0.5">ポジション</label>
                      <input value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="FW" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(player.id)} disabled={savingEdit || !editForm.name.trim()}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-40">
                      <Check size={13} /> {savingEdit ? '保存中...' : '保存'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200">
                      <X size={13} /> キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                /* 通常表示 */
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Link href={`/dashboard/players/${player.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-bold text-sm">{player.number ?? player.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{player.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[player.number ? `#${player.number}` : null, player.position].filter(Boolean).join(' · ') || '情報未設定'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </Link>

                  {/* 編集・削除ボタン */}
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0 ml-1">
                      <button onClick={() => startEdit(player)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(player)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
