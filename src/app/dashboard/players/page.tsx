'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, Plus, X, Search, ChevronRight } from 'lucide-react'
import type { Player } from '@/types'

export default function PlayersPage() {
  const supabase = createClient()
  const [players, setPlayers] = useState<Player[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '' })
  const [submitting, setSubmitting] = useState(false)

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('players')
      .insert({ name: form.name.trim(), number: form.number.trim() || null, position: form.position.trim() || null, sport: 'soccer' })
      .select()
      .single()
    if (!error && data) {
      setPlayers(prev => [...prev, data].sort((a, b) => {
        const na = parseInt(a.number ?? '999'), nb = parseInt(b.number ?? '999')
        return na - nb || a.name.localeCompare(b.name)
      }))
      setForm({ name: '', number: '', position: '' })
      setShowForm(false)
    }
    setSubmitting(false)
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
            onClick={() => setShowForm(!showForm)}
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
              <input
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">名前 <span className="text-red-500">*</span></label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">ポジション</label>
              <input
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="FW"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !form.name.trim()}
            className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? '追加中...' : '追加する'}
          </button>
        </form>
      )}

      {/* 検索 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="名前・番号・ポジションで検索"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {/* 選手一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? '該当する選手が見つかりません' : '選手が登録されていません'}
          </p>
          {isAdmin && !search && (
            <p className="text-sm text-gray-400 mt-1">「選手追加」から登録してください</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.map((player, i) => (
            <Link
              key={player.id}
              href={`/dashboard/players/${player.id}`}
              className={`flex items-center gap-4 px-4 py-3.5 hover:bg-green-50 transition-colors ${
                i < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* アバター */}
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold text-sm">
                  {player.number ?? player.name.charAt(0)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{player.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[player.number ? `#${player.number}` : null, player.position].filter(Boolean).join(' · ') || '情報未設定'}
                </p>
              </div>

              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
