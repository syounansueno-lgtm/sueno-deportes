'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Users, Plus, X, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types'

type AnnouncementWithReads = Announcement & {
  expires_at: string | null
  announcement_reads: { user_id: string; profiles: { full_name: string } | null }[]
  author: { full_name: string } | null
}

type StaffProfile = {
  id: string
  full_name: string
  role: string
}

type Props = {
  announcements: AnnouncementWithReads[]
  readIds: string[]
  isAdmin: boolean
  userId: string
  staffList: StaffProfile[]
}

export default function AnnouncementsClient({ announcements, readIds: initialReadIds, isAdmin, userId, staffList }: Props) {
  const [readIds, setReadIds] = useState(new Set(initialReadIds))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showReaders, setShowReaders] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // フォーム状態
  const [form, setForm] = useState({
    title: '',
    body: '',
    is_urgent: false,
    expires_at: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [localAnnouncements, setLocalAnnouncements] = useState(announcements)

  async function handleDelete(announcementId: string) {
    if (!window.confirm('この告知を削除しますか？')) return
    const { error } = await supabase.from('announcements').delete().eq('id', announcementId)
    if (!error) {
      setLocalAnnouncements(prev => prev.filter(a => a.id !== announcementId))
    }
  }

  async function markAsRead(announcementId: string) {
    if (readIds.has(announcementId)) return
    const { error } = await supabase
      .from('announcement_reads')
      .insert({ announcement_id: announcementId, user_id: userId })
    if (!error) {
      setReadIds(prev => new Set([...prev, announcementId]))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: form.title,
        body: form.body,
        is_urgent: form.is_urgent,
        sport: 'all',
        expires_at: form.expires_at || null,
        author_id: userId,
      })
      .select('*, announcement_reads(*), author:profiles!announcements_author_id_fkey(full_name)')
      .single()

    if (!error && data) {
      setLocalAnnouncements(prev => [data as AnnouncementWithReads, ...prev])
      setForm({ title: '', body: '', is_urgent: false, expires_at: '' })
      setShowForm(false)

      // LINEグループに通知（設定済みの場合のみ）
      fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          is_urgent: data.is_urgent,
        }),
      }).catch(() => {/* LINE未設定時は無視 */})
    }
    setSubmitting(false)
  }

  const active = localAnnouncements.filter(a =>
    !a.expires_at || new Date(a.expires_at) > new Date()
  )
  const expired = localAnnouncements.filter(a =>
    a.expires_at && new Date(a.expires_at) <= new Date()
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">重要告知</h1>
          <p className="text-sm text-gray-500 mt-0.5">スタッフ全員が確認してください</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'キャンセル' : '新規投稿'}
          </button>
        )}
      </div>

      {/* 新規投稿フォーム（管理者のみ） */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-green-500 p-5 mb-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">告知を作成</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">タイトル</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例：今週の練習について"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">内容</label>
              <textarea
                required
                rows={4}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="告知の詳細を入力..."
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">掲載期限（任意）</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_urgent}
                    onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-sm font-medium text-red-600">緊急</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      )}

      {/* 未読バナー */}
      {(() => {
        const unreadCount = active.filter(a => !readIds.has(a.id)).length
        if (unreadCount === 0) return null
        return (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              未確認の告知が <span className="text-lg font-bold">{unreadCount}件</span> あります
            </p>
          </div>
        )
      })()}

      {/* アクティブな告知一覧 */}
      <div className="space-y-3">
        {active.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
            告知はありません
          </div>
        ) : (
          active.map(a => {
            const isRead = readIds.has(a.id)
            const isExpanded = expanded === a.id
            const showingReaders = showReaders === a.id
            const readerCount = a.announcement_reads?.length ?? 0
            const unreadStaff = staffList.filter(s => !a.announcement_reads?.some(r => r.user_id === s.id))

            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl border-2 transition-all ${
                  a.is_urgent
                    ? 'border-red-400 shadow-md'
                    : isRead
                    ? 'border-gray-200'
                    : 'border-amber-400 shadow-sm'
                }`}
              >
                {/* カードヘッダー */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 既読/未読インジケーター */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isRead ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.is_urgent && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle size={10} />
                            緊急
                          </span>
                        )}
                        {!isRead && (
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded">
                            未読
                          </span>
                        )}
                      </div>
                      <h3 className={`font-bold text-base leading-snug ${a.is_urgent ? 'text-red-800' : 'text-gray-900'}`}>
                        {a.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-xs text-gray-400">
                          {format(new Date(a.published_at), 'M月d日(E) HH:mm', { locale: ja })}
                        </p>
                        {a.author && (
                          <p className="text-xs text-gray-400">by {a.author.full_name}</p>
                        )}
                        {a.expires_at && (
                          <p className="text-xs text-gray-400">
                            期限: {format(new Date(a.expires_at), 'M/d HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : a.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* 本文（展開時） */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {a.body}
                      </p>

                      {/* 既読ボタン */}
                      {!isRead && (
                        <button
                          onClick={() => markAsRead(a.id)}
                          className={`mt-4 w-full py-3 rounded-xl font-bold text-base transition-colors ${
                            a.is_urgent
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          ✓ 確認しました
                        </button>
                      )}
                      {isRead && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-green-600 text-sm font-medium bg-green-50 rounded-xl py-2.5">
                          <CheckCircle2 size={16} />
                          確認済み
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 管理者：既読状況 */}
                {isAdmin && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    <button
                      onClick={() => setShowReaders(showingReaders ? null : a.id)}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Users size={13} />
                      <span>既読 {readerCount}人 / 未読 {unreadStaff.length}人</span>
                      {showingReaders ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {showingReaders && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 pb-2">
                        {staffList.map(staff => {
                          const hasRead = a.announcement_reads?.some(r => r.user_id === staff.id)
                          return (
                            <div
                              key={staff.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                                hasRead ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {hasRead
                                ? <CheckCircle2 size={12} />
                                : <div className="w-3 h-3 rounded-full bg-red-400" />
                              }
                              <span className="truncate">{staff.full_name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 期限切れアーカイブ（管理者のみ） */}
      {isAdmin && expired.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3">過去の告知（期限切れ）</h2>
          <div className="space-y-2">
            {expired.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
                <h3 className="text-sm font-medium text-gray-700">{a.title}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(a.published_at), 'M月d日', { locale: ja })} 〜
                  {a.expires_at && format(new Date(a.expires_at), ' M月d日', { locale: ja })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
