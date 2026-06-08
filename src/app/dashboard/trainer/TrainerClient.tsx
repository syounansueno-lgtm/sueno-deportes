'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Stethoscope, Plus, X, Trash2, ClipboardList, Clock, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react'
import type { TrainerComment, TrainingMenu } from '@/types'

const CATEGORIES = ['体幹・バランス', 'スピード・ダッシュ', '持久力・スタミナ', '下半身筋力', '上半身筋力', '柔軟性', 'アジリティ', 'その他']
const EMPTY_MENU = { title: '', category: '', content: '', duration_minutes: '', notes: '' }

export default function TrainerClient({ initialComments, initialMenus, isAdmin }: {
  initialComments: TrainerComment[]; initialMenus: TrainingMenu[]; isAdmin: boolean
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'comments' | 'menus'>('comments')

  // ===== コメント =====
  const [comments, setComments] = useState<TrainerComment[]>(initialComments)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  // ===== メニュー =====
  const [menus, setMenus] = useState<TrainingMenu[]>(initialMenus)
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [menuForm, setMenuForm] = useState(EMPTY_MENU)
  const [submittingMenu, setSubmittingMenu] = useState(false)
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [editMenuForm, setEditMenuForm] = useState(EMPTY_MENU)
  const [savingMenu, setSavingMenu] = useState(false)

  // ---- コメント投稿 ----
  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('trainer_comments')
      .insert({ content: commentText.trim(), created_by: user!.id }).select().single()
    if (data) { setComments(prev => [data, ...prev]); setCommentText(''); setShowCommentForm(false) }
    setSubmittingComment(false)
  }

  async function saveCommentEdit(id: string) {
    if (!editCommentText.trim()) return
    setSavingComment(true)
    const { data } = await supabase.from('trainer_comments')
      .update({ content: editCommentText.trim() }).eq('id', id).select().single()
    if (data) { setComments(prev => prev.map(c => c.id === id ? data : c)); setEditingCommentId(null) }
    setSavingComment(false)
  }

  async function deleteComment(id: string) {
    if (!window.confirm('削除しますか？')) return
    await supabase.from('trainer_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  // ---- メニュー投稿 ----
  async function submitMenu(e: React.FormEvent) {
    e.preventDefault()
    if (!menuForm.title.trim() || !menuForm.content.trim()) return
    setSubmittingMenu(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('training_menus').insert({
      title: menuForm.title.trim(), category: menuForm.category || null,
      content: menuForm.content.trim(),
      duration_minutes: menuForm.duration_minutes ? parseInt(menuForm.duration_minutes) : null,
      notes: menuForm.notes.trim() || null, created_by: user!.id,
    }).select().single()
    if (data) { setMenus(prev => [data, ...prev]); setMenuForm(EMPTY_MENU); setShowMenuForm(false) }
    setSubmittingMenu(false)
  }

  async function saveMenuEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMenuId || !editMenuForm.title.trim() || !editMenuForm.content.trim()) return
    setSavingMenu(true)
    const { data } = await supabase.from('training_menus').update({
      title: editMenuForm.title.trim(), category: editMenuForm.category || null,
      content: editMenuForm.content.trim(),
      duration_minutes: editMenuForm.duration_minutes ? parseInt(editMenuForm.duration_minutes) : null,
      notes: editMenuForm.notes.trim() || null,
    }).eq('id', editingMenuId).select().single()
    if (data) { setMenus(prev => prev.map(m => m.id === editingMenuId ? data : m)); setEditingMenuId(null) }
    setSavingMenu(false)
  }

  async function deleteMenu(id: string) {
    if (!window.confirm('このメニューを削除しますか？')) return
    await supabase.from('training_menus').delete().eq('id', id)
    setMenus(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">トレーナー</h1>
        <p className="text-sm text-gray-500 mt-0.5">フィードバック・トレーニングメニュー管理</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {([['comments', 'フィードバック', Stethoscope], ['menus', 'トレーニングメニュー', ClipboardList]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ===== フィードバックタブ ===== */}
      {tab === 'comments' && (
        <>
          {isAdmin && (
            <div className="mb-4">
              {showCommentForm ? (
                <form onSubmit={submitComment} className="bg-white rounded-2xl border-2 border-purple-400 p-5 shadow-sm">
                  <h2 className="font-bold text-gray-900 mb-3">チームへのフィードバック</h2>
                  <textarea autoFocus rows={5} required value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
                    placeholder="気になったこと、アドバイス、全体フィードバックなど..." />
                  <div className="flex gap-2">
                    <button type="submit" disabled={submittingComment || !commentText.trim()}
                      className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-40">
                      {submittingComment ? '投稿中...' : '投稿する'}
                    </button>
                    <button type="button" onClick={() => setShowCommentForm(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">キャンセル</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowCommentForm(true)}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors w-full justify-center">
                  <Plus size={16} /> フィードバックを投稿
                </button>
              )}
            </div>
          )}

          {comments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Stethoscope size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">フィードバックはまだありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  {editingCommentId === c.id ? (
                    <div>
                      <textarea rows={5} value={editCommentText}
                        onChange={e => setEditCommentText(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-3" />
                      <div className="flex gap-2">
                        <button onClick={() => saveCommentEdit(c.id)} disabled={savingComment || !editCommentText.trim()}
                          className="flex items-center gap-1 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40">
                          <Check size={14} /> {savingComment ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => setEditingCommentId(null)}
                          className="flex items-center gap-1 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-200">
                          <X size={14} /> キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Stethoscope size={15} className="text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-purple-700">トレーナー</p>
                            <p className="text-xs text-gray-400">{format(new Date(c.created_at), 'yyyy年M月d日（E） HH:mm', { locale: ja })}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content) }}
                            className="p-1.5 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteComment(c.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== メニュータブ ===== */}
      {tab === 'menus' && (
        <>
          {isAdmin && (
            <div className="mb-4">
              {showMenuForm ? (
                <form onSubmit={submitMenu} className="bg-white rounded-2xl border-2 border-orange-400 p-5 shadow-sm">
                  <h2 className="font-bold text-gray-900 mb-4">トレーニングメニューを作成</h2>
                  <MenuFields form={menuForm} setForm={setMenuForm} accentColor="orange" />
                  <div className="flex gap-2 mt-4">
                    <button type="submit" disabled={submittingMenu || !menuForm.title.trim() || !menuForm.content.trim()}
                      className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-40">
                      {submittingMenu ? '保存中...' : '保存する'}
                    </button>
                    <button type="button" onClick={() => setShowMenuForm(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">キャンセル</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => { setShowMenuForm(true); setEditingMenuId(null) }}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors w-full justify-center">
                  <Plus size={16} /> メニューを作成
                </button>
              )}
            </div>
          )}

          {/* 編集フォーム */}
          {editingMenuId && isAdmin && (
            <form onSubmit={saveMenuEdit} className="bg-white rounded-2xl border-2 border-orange-400 p-5 shadow-sm mb-4">
              <h2 className="font-bold text-gray-900 mb-4">メニューを編集</h2>
              <MenuFields form={editMenuForm} setForm={setEditMenuForm} accentColor="orange" />
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={savingMenu || !editMenuForm.title.trim() || !editMenuForm.content.trim()}
                  className="flex items-center gap-1 flex-1 justify-center bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-40">
                  <Check size={14} /> {savingMenu ? '保存中...' : '保存する'}
                </button>
                <button type="button" onClick={() => setEditingMenuId(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">キャンセル</button>
              </div>
            </form>
          )}

          {menus.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">メニューはまだありません</p>
              {isAdmin && <p className="text-sm text-gray-400 mt-1">「メニューを作成」から追加してください</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {menus.map(menu => (
                <div key={menu.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button onClick={() => setExpandedMenu(expandedMenu === menu.id ? null : menu.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={18} className="text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{menu.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {menu.category && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{menu.category}</span>}
                          {menu.duration_minutes && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={11} /> {menu.duration_minutes}分</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setEditingMenuId(menu.id); setEditMenuForm({ title: menu.title, category: menu.category ?? '', content: menu.content, duration_minutes: menu.duration_minutes?.toString() ?? '', notes: menu.notes ?? '' }); setShowMenuForm(false); setExpandedMenu(null) }}
                            className="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteMenu(menu.id) }}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {expandedMenu === menu.id ? <ChevronUp size={18} className="text-gray-400 ml-1" /> : <ChevronDown size={18} className="text-gray-400 ml-1" />}
                    </div>
                  </button>
                  {expandedMenu === menu.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{menu.content}</pre>
                      {menu.notes && (
                        <div className="mt-3 bg-orange-50 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-orange-700 mb-1">💡 アドバイス</p>
                          <p className="text-sm text-orange-800">{menu.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-3">作成日：{format(new Date(menu.created_at), 'yyyy/M/d', { locale: ja })}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// メニューフォームの共通フィールド
function MenuFields({ form, setForm, accentColor }: {
  form: typeof EMPTY_MENU; setForm: (f: typeof EMPTY_MENU) => void; accentColor: string
}) {
  const ring = `focus:ring-${accentColor}-500`
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">メニュー名 <span className="text-red-500">*</span></label>
          <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
            placeholder="体幹強化プログラム" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">カテゴリ</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}>
            <option value="">選択してください</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">所要時間（分）</label>
          <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
            placeholder="30" />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-1">メニュー内容 <span className="text-red-500">*</span></label>
        <textarea required rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
          className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring} resize-none`}
          placeholder={"1. プランク 30秒 × 3セット\n2. サイドプランク 各20秒 × 3セット\n3. クランチ 20回 × 3セット"} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">メモ・アドバイス</label>
        <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring} resize-none`}
          placeholder="週2回推奨など..." />
      </div>
    </>
  )
}
