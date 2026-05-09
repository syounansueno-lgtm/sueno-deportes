'use client'

import { useState } from 'react'
import { Search, Shield, Users, Phone, Mail, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Profile, Sport } from '@/types'

type MemberSlim = {
  id: string
  full_name: string
  role: string
  sports: Sport[]
  avatar_url: string | null
  jersey_number: string | null
  position: string | null
  // 管理者のみ
  email?: string
  phone?: string
  birth_date?: string | null
  membership_status?: string
  created_at?: string
}

type Props = {
  members: MemberSlim[]
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

export default function MembersClient({ members, isAdmin }: Props) {
  const [query, setQuery] = useState('')
  const [filterSport, setFilterSport] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [selected, setSelected] = useState<MemberSlim | null>(null)

  const filtered = members.filter(m => {
    const matchQuery = !query || m.full_name.includes(query) || (m.email ?? '').includes(query)
    const matchSport = filterSport === 'all' || m.sports?.includes(filterSport as Sport)
    const matchRole = filterRole === 'all' || m.role === filterRole
    return matchQuery && matchSport && matchRole
  })

  const staffMembers = filtered.filter(m => m.role === 'admin' || m.role === 'staff')
  const players = filtered.filter(m => m.role === 'player' || m.role === 'parent' || m.role === 'member')

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会員管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            全{members.length}名
            {!isAdmin && ' (スタッフ権限：氏名・写真のみ表示)'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">
          {isAdmin ? <Shield size={12} className="text-yellow-500" /> : <Users size={12} />}
          {isAdmin ? '管理者モード' : 'スタッフモード'}
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="名前で検索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={filterSport}
          onChange={e => setFilterSport(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">全スポーツ</option>
          <option value="soccer">サッカー</option>
          <option value="karate">空手</option>
          <option value="pickleball">ピックルボール</option>
          <option value="gymnastics">体操</option>
        </select>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">全ロール</option>
          <option value="admin">管理者</option>
          <option value="staff">スタッフ</option>
          <option value="player">選手</option>
          <option value="parent">保護者</option>
        </select>
      </div>

      {/* スタッフ一覧 */}
      {staffMembers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Shield size={14} className="text-yellow-500" />
            スタッフ・管理者
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {staffMembers.map(m => (
              <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)} isStaff />
            ))}
          </div>
        </div>
      )}

      {/* 選手・会員一覧 */}
      {players.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users size={14} />
            選手・会員
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {players.map(m => (
              <MemberCard key={m.id} member={m} isAdmin={isAdmin} onClick={() => setSelected(m)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          該当する会員が見つかりません
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              {/* プロフィールヘッダー */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl font-bold text-green-700 flex-shrink-0 overflow-hidden">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selected.full_name.charAt(0)
                  )}
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
                    <p className="text-xs text-gray-400">
                      登録日: {format(new Date(selected.created_at), 'yyyy/M/d')}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelected(null)}
                className="mt-5 w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemberCard({ member, isAdmin, onClick, isStaff = false }: {
  member: MemberSlim
  isAdmin: boolean
  onClick: () => void
  isStaff?: boolean
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
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          member.full_name.charAt(0)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
          {member.jersey_number && (
            <span className="text-xs text-gray-400">#{member.jersey_number}</span>
          )}
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {member.sports?.slice(0, 2).map(s => (
            <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${SPORT_COLORS[s] ?? 'bg-gray-100 text-gray-500'}`}>
              {SPORT_LABELS[s] ?? s}
            </span>
          ))}
          {member.position && (
            <span className="text-xs text-gray-400">{member.position}</span>
          )}
        </div>
      </div>
    </button>
  )
}
