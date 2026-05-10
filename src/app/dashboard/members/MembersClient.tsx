'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Shield, Users, Phone, Mail, Calendar, Download, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Sport } from '@/types'

type SoccerCategory = 'kinderg' | 'jr_youth' | 'youth' | 'women' | 'adult' | null

type MemberSlim = {
  id: string
  full_name: string
  role: string
  sports: Sport[]
  avatar_url: string | null
  jersey_number: string | null
  position: string | null
  soccer_category: SoccerCategory
  // 管理者のみ
  email?: string
  phone?: string
  birth_date?: string | null
  membership_status?: string
  created_at?: string
}

type Props = {
  isAdmin: boolean
}

const SPORT_LABELS: Record<string, string> = {
  soccer: 'サッカー',
  karate: '空手',
  pickleball: 'ピックルボール',
  gymnastics: '体操',
}

const SPORT_COLORS: Record<string, string> = {
  soccer: 'bg-green-100 text-green-700',
  karate: 'bg-red-100 text-red-700',
  pickleball: 'bg-yellow-100 text-yellow-700',
  gymnastics: 'bg-blue-100 text-blue-700',
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  staff: 'スタッフ',
  player: '選手',
  parent: '保護者',
  member: '会員',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
}

// サッカーカテゴリー定義
const SOCCER_CATEGORIES: { key: SoccerCategory; label: string; color: string; bg: string }[] = [
  { key: 'kinderg',  label: 'Jr.キンダー', color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-200' },
  { key: 'jr_youth', label: 'Jr.ユース',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { key: 'youth',    label: 'ユース',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { key: 'women',    label: '女子',        color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { key: 'adult',    label: '大人のサッカー', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
]

export default function MembersClient({ isAdmin }: Props) {
  const supabase = createClient()
  const [dataLoaded, setDataLoaded] = useState(false)
  const [members, setMembers] = useState<MemberSlim[]>([])
  const [query, setQuery] = useState('')
  const [filterSport, setFilterSport] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [soccerTab, setSoccerTab] = useState<SoccerCategory | 'all'>('all')
  const [selected, setSelected] = useState<MemberSlim | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)

  // ページ表示後にデータ取得
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, sports, jersey_number, position, birth_date, membership_status, avatar_url, created_at, soccer_category')
        .order('full_name')
      setMembers((data ?? []) as MemberSlim[])
      setDataLoaded(true)
    }
    fetchData()
  }, [])

  // 承認・却下
  async function updateMemberStatus(memberId: string, status: 'active' | 'inactive') {
    setApproving(memberId)
    const { error } = await supabase
      .from('profiles')
      .update({ membership_status: status })
      .eq('id', memberId)
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, membership_status: status } : m))
      if (selected?.id === memberId) setSelected(prev => prev ? { ...prev, membership_status: status } : null)
    }
    setApproving(null)
  }

  // サッカーカテゴリー変更（管理者のみ）
  async function updateSoccerCategory(memberId: string, category: SoccerCategory) {
    setSavingCategory(true)
    const { error } = await supabase
      .from('profiles')
      .update({ soccer_category: category })
      .eq('id', memberId)
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, soccer_category: category } : m))
      if (selected?.id === memberId) setSelected(prev => prev ? { ...prev, soccer_category: category } : null)
    }
    setSavingCategory(false)
  }

  // CSV出力
  function downloadCSV() {
    const catLabel = (c: SoccerCategory) => SOCCER_CATEGORIES.find(x => x.key === c)?.label ?? ''
    const headers = ['氏名', 'メール', '電話', 'ロール', 'ステータス', 'スポーツ', 'サッカーカテゴリー', '背番号', 'ポジション', '生年月日', '登録日']
    const rows = members.map(m => [
      m.full_name,
      m.email ?? '',
      m.phone ?? '',
      ROLE_LABELS[m.role] ?? m.role,
      m.membership_status === 'active' ? '有効' : m.membership_status === 'pending' ? '審査中' : '無効',
      (m.sports ?? []).map(s => SPORT_LABELS[s] ?? s).join('/'),
      catLabel(m.soccer_category),
      m.jersey_number ?? '',
      m.position ?? '',
      m.birth_date ? format(new Date(m.birth_date), 'yyyy/MM/dd') : '',
      m.created_at ? format(new Date(m.created_at), 'yyyy/MM/dd') : '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `会員名簿_${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!dataLoaded) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded-lg w-36" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const pendingMembers = members.filter(m => m.membership_status === 'pending')

  const filtered = members.filter(m => {
    if (isAdmin && m.membership_status === 'pending' && filterRole === 'all' && !query && filterSport === 'all') return false
    const matchQuery = !query || m.full_name.includes(query) || (m.email ?? '').includes(query)
    const matchSport = filterSport === 'all' || m.sports?.includes(filterSport as Sport)
    const matchRole = filterRole === 'all' || m.role === filterRole
    return matchQuery && matchSport && matchRole
  })

  const staffMembers = filtered.filter(m => m.role === 'admin' || m.role === 'staff')
  const players = filtered.filter(m => m.role !== 'admin' && m.role !== 'staff')

  // サッカー表示モード
  const showSoccerView = filterSport === 'soccer' && !query && filterRole === 'all'
  const soccerPlayers = players.filter(m => m.sports?.includes('soccer'))

  // サッカータブ別に絞り込み
  const soccerFiltered = soccerTab === 'all'
    ? soccerPlayers
    : soccerPlayers.filter(m => m.soccer_category === soccerTab)

  // 未割当カウント
  const unassignedCount = soccerPlayers.filter(m => !m.soccer_category).length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会員管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            全{members.length}名
            {!isAdmin && ' (スタッフ権限：氏名・写真のみ表示)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 text-sm text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              <Download size={14} />CSV出力
            </button>
          )}
          <div className="flex items-center gap-2 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">
            {isAdmin ? <Shield size={12} className="text-yellow-500" /> : <Users size={12} />}
            {isAdmin ? '管理者モード' : 'スタッフモード'}
          </div>
        </div>
      </div>

      {/* 承認待ち会員 */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-yellow-600" />
            <h2 className="font-bold text-yellow-800">承認待ちの会員 ({pendingMembers.length}名)</h2>
          </div>
          <div className="space-y-2">
            {pendingMembers.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-yellow-200 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-bold text-yellow-700 flex-shrink-0 overflow-hidden">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{m.full_name}</p>
                    {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateMemberStatus(m.id, 'active')} disabled={approving === m.id}
                    className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle2 size={12} />承認
                  </button>
                  <button onClick={() => updateMemberStatus(m.id, 'inactive')} disabled={approving === m.id}
                    className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50">
                    <XCircle size={12} />却下
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="名前で検索..."
            value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select value={filterSport} onChange={e => { setFilterSport(e.target.value); setSoccerTab('all') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">全スポーツ</option>
          <option value="soccer">⚽ サッカー</option>
          <option value="karate">🥋 空手</option>
          <option value="pickleball">🏓 ピックルボール</option>
          <option value="gymnastics">🤸 体操</option>
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">全ロール</option>
          <option value="admin">管理者</option>
          <option value="staff">スタッフ</option>
          <option value="player">選手</option>
          <option value="parent">保護者</option>
        </select>
      </div>

      {/* ===== サッカーカテゴリービュー ===== */}
      {showSoccerView ? (
        <div>
          {/* サッカーカテゴリータブ */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            <button
              onClick={() => setSoccerTab('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                soccerTab === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全員 ({soccerPlayers.length})
            </button>
            {SOCCER_CATEGORIES.map(cat => {
              const count = soccerPlayers.filter(m => m.soccer_category === cat.key).length
              return (
                <button
                  key={cat.key}
                  onClick={() => setSoccerTab(cat.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    soccerTab === cat.key
                      ? 'bg-green-600 text-white border-green-600'
                      : `${cat.bg} ${cat.color} border-transparent hover:border-current`
                  }`}
                >
                  {cat.label} ({count})
                </button>
              )
            })}
            {unassignedCount > 0 && (
              <button
                onClick={() => setSoccerTab(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  soccerTab === null
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-gray-100 text-gray-500 border-transparent hover:border-gray-300'
                }`}
              >
                未分類 ({unassignedCount})
              </button>
            )}
          </div>

          {/* サッカーカテゴリー別表示 */}
          {soccerTab === 'all' ? (
            // 全員表示：カテゴリーごとにセクション分け
            <div className="space-y-6">
              {SOCCER_CATEGORIES.map(cat => {
                const catMembers = soccerPlayers.filter(m => m.soccer_category === cat.key)
                if (catMembers.length === 0) return null
                return (
                  <div key={cat.key}>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-2 w-fit ${cat.bg} ${cat.color}`}>
                      <span className="text-sm font-bold">{cat.label}</span>
                      <span className="text-xs opacity-70">{catMembers.length}名</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {catMembers.map(m => (
                        <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)}
                          categoryLabel={cat.label} categoryColor={cat.color} categoryBg={cat.bg} />
                      ))}
                    </div>
                  </div>
                )
              })}
              {unassignedCount > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 mb-2 w-fit">
                    <span className="text-sm font-bold text-gray-500">未分類</span>
                    <span className="text-xs text-gray-400">{unassignedCount}名</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {soccerPlayers.filter(m => !m.soccer_category).map(m => (
                      <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)} />
                    ))}
                  </div>
                </div>
              )}
              {soccerPlayers.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  サッカー選手が登録されていません
                </div>
              )}
            </div>
          ) : (
            // 特定カテゴリー表示
            <div>
              {(() => {
                const cat = SOCCER_CATEGORIES.find(c => c.key === soccerTab)
                const label = cat?.label ?? '未分類'
                const bg = cat?.bg ?? 'bg-gray-50 border-gray-200'
                const color = cat?.color ?? 'text-gray-500'
                return (
                  <>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-3 w-fit ${bg} ${color}`}>
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs opacity-70">{soccerFiltered.length}名</span>
                    </div>
                    {soccerFiltered.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                        このカテゴリーには選手がいません
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {soccerFiltered.map(m => (
                          <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)}
                            categoryLabel={cat?.label} categoryColor={cat?.color} categoryBg={cat?.bg} />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      ) : (
        // ===== 通常ビュー =====
        <div>
          {staffMembers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield size={14} className="text-yellow-500" />スタッフ・管理者
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {staffMembers.map(m => (
                  <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)} isStaff />
                ))}
              </div>
            </div>
          )}
          {players.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users size={14} />選手・会員
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {players.map(m => (
                  <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)} />
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && pendingMembers.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              該当する会員が見つかりません
            </div>
          )}
        </div>
      )}

      {/* ===== 詳細モーダル ===== */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* プロフィールヘッダー */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl font-bold text-green-700 flex-shrink-0 overflow-hidden">
                  {selected.avatar_url
                    ? <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" />
                    : selected.full_name.charAt(0)
                  }
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selected.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      selected.role === 'admin' ? 'bg-yellow-100 text-yellow-700' :
                      selected.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ROLE_LABELS[selected.role] ?? selected.role}
                    </span>
                    {selected.membership_status && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLES[selected.membership_status] ?? ''}`}>
                        {selected.membership_status === 'active' ? '会員有効' :
                         selected.membership_status === 'pending' ? '審査中' : '無効'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* スポーツ */}
              {selected.sports?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">所属スポーツ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.sports.map(s => (
                      <span key={s} className={`text-xs px-2 py-1 rounded font-medium ${SPORT_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SPORT_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* サッカーカテゴリー（サッカー選手のみ） */}
              {selected.sports?.includes('soccer') && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">サッカーカテゴリー</p>
                  {isAdmin ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {SOCCER_CATEGORIES.map(cat => (
                        <button
                          key={cat.key}
                          onClick={() => updateSoccerCategory(selected.id, selected.soccer_category === cat.key ? null : cat.key)}
                          disabled={savingCategory}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
                            selected.soccer_category === cat.key
                              ? `${cat.bg} ${cat.color} border-current ring-2 ring-offset-1 ring-green-400`
                              : `bg-white ${cat.color} border-gray-200 hover:${cat.bg}`
                          }`}
                        >
                          {cat.label}
                          {selected.soccer_category === cat.key && <CheckCircle2 size={14} />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {selected.soccer_category ? (
                        (() => {
                          const cat = SOCCER_CATEGORIES.find(c => c.key === selected.soccer_category)
                          return (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${cat?.bg ?? ''} ${cat?.color ?? ''}`}>
                              {cat?.label ?? ''}
                            </span>
                          )
                        })()
                      ) : (
                        <span className="text-xs text-gray-400">未設定</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ポジション・背番号 */}
              {(selected.jersey_number || selected.position) && (
                <div className="flex gap-4 mb-4">
                  {selected.jersey_number && (
                    <div>
                      <p className="text-xs text-gray-500">背番号</p>
                      <p className="font-bold text-gray-800">#{selected.jersey_number}</p>
                    </div>
                  )}
                  {selected.position && (
                    <div>
                      <p className="text-xs text-gray-500">ポジション</p>
                      <p className="font-medium text-gray-800">{selected.position}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 管理者のみ：連絡先情報 */}
              {isAdmin && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Shield size={12} className="text-yellow-500" /> 管理者情報
                  </p>
                  {selected.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{selected.email}</span>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-gray-400" />
                      <a href={`tel:${selected.phone}`} className="text-sm text-blue-600">{selected.phone}</a>
                    </div>
                  )}
                  {selected.birth_date && (
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {format(new Date(selected.birth_date), 'yyyy年M月d日', { locale: ja })}
                      </span>
                    </div>
                  )}
                  {selected.created_at && (
                    <p className="text-xs text-gray-400">登録日: {format(new Date(selected.created_at), 'yyyy/M/d')}</p>
                  )}

                  {selected.membership_status === 'pending' && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-yellow-700 mb-2">会員申請を承認しますか？</p>
                      <div className="flex gap-2">
                        <button onClick={() => updateMemberStatus(selected.id, 'active')} disabled={approving === selected.id}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50">
                          <CheckCircle2 size={14} /> 承認する
                        </button>
                        <button onClick={() => updateMemberStatus(selected.id, 'inactive')} disabled={approving === selected.id}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-600 disabled:opacity-50">
                          <XCircle size={14} /> 却下する
                        </button>
                      </div>
                    </div>
                  )}
                  {selected.membership_status === 'active' && (
                    <button onClick={() => updateMemberStatus(selected.id, 'inactive')} disabled={approving === selected.id}
                      className="w-full text-xs text-gray-400 hover:text-red-500 py-1 border border-dashed border-gray-200 rounded-lg transition-colors">
                      会員を無効化する
                    </button>
                  )}
                  {selected.membership_status === 'inactive' && (
                    <button onClick={() => updateMemberStatus(selected.id, 'active')} disabled={approving === selected.id}
                      className="w-full text-xs text-gray-400 hover:text-green-600 py-1 border border-dashed border-gray-200 rounded-lg transition-colors">
                      会員を有効化する
                    </button>
                  )}
                </div>
              )}

              <button onClick={() => setSelected(null)}
                className="mt-5 w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemberCard({ member, isAdmin, onClick, isStaff = false, categoryLabel, categoryColor, categoryBg }: {
  member: MemberSlim
  isAdmin: boolean
  onClick: () => void
  isStaff?: boolean
  categoryLabel?: string
  categoryColor?: string
  categoryBg?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-3 hover:shadow-md transition-shadow flex items-center gap-3 ${
        isStaff ? 'border-yellow-200' : 'border-gray-200'
      }`}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden ${
        isStaff ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
      }`}>
        {member.avatar_url
          ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
          : member.full_name.charAt(0)
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
          {member.jersey_number && (
            <span className="text-xs text-gray-400">#{member.jersey_number}</span>
          )}
        </div>
        <div className="flex gap-1 mt-1 flex-wrap items-center">
          {member.position && (
            <span className="text-xs text-gray-400">{member.position}</span>
          )}
          {categoryLabel && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${categoryBg ?? ''} ${categoryColor ?? ''}`}>
              {categoryLabel}
            </span>
          )}
          {!categoryLabel && member.sports?.slice(0, 2).map(s => (
            <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${
              s === 'soccer' ? 'bg-green-100 text-green-700' :
              s === 'karate' ? 'bg-red-100 text-red-700' :
              s === 'pickleball' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {SPORT_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}
