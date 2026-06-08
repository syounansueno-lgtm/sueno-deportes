'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Stethoscope, Plus, X, Trash2 } from 'lucide-react'
import type { TrainerComment } from '@/types'

export default function TrainerPage() {
  const supabase = createClient()
  const [comments, setComments] = useState<TrainerComment[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('trainer_comments').select('*').order('created_at', { ascending: false }),
      ])
      setIsAdmin(['admin', 'staff'].includes(profileRes.data?.role ?? ''))
      setComments(commentsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('trainer_comments')
      .insert({ content: text.trim(), created_by: user!.id })
      .select()
      .single()
    if (data) {
      setComments(prev => [data, ...prev])
      setText('')
      setShowForm(false)
    }
    setSubmitting(false)
  }

  async function handleDelete(cid: string) {
    if (!window.confirm('このコメントを削除しますか？')) return
    await supabase.from('trainer_comments').delete().eq('id', cid)
    setComments(prev => prev.filter(c => c.id !== cid))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">トレーナーコメント</h1>
          <p className="text-sm text-gray-500 mt-0.5">気になった時にチーム全体へのフィードバック</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'キャンセル' : 'コメント追加'}
          </button>
        )}
      </div>

      {/* 投稿フォーム */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-purple-400 p-5 mb-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">チームへのフィードバック</h2>
          <textarea
            autoFocus
            rows={5}
            required
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
            placeholder="試合・練習を通じて気になったこと、アドバイス、全体フィードバックなど..."
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? '投稿中...' : '投稿する'}
          </button>
        </form>
      )}

      {/* コメント一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : comments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Stethoscope size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">コメントはまだありません</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">気になった時にコメントを追加してください</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Stethoscope size={15} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-700">トレーナー</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(c.created_at), 'yyyy年M月d日（E） HH:mm', { locale: ja })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
