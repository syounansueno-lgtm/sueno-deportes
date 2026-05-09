'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Package, Search, Plus, X, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'

type EquipmentItem = {
  id: string
  name: string
  description: string | null
  category: string
  status: string
  quantity: number
  location: string | null
  notes: string | null
  found_date: string | null
  created_at: string
  reported_by: string | null
  profiles?: { full_name: string } | null
}

type Props = {
  items: EquipmentItem[]
  isAdmin: boolean
  userId: string
}

const CATEGORIES = [
  { key: 'all', label: 'すべて', emoji: '📦' },
  { key: 'equipment', label: '備品', emoji: '🏋️' },
  { key: 'lost_found', label: '忘れ物', emoji: '🔍' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  available: { label: '使用可', color: 'bg-green-100 text-green-700', emoji: '✅' },
  in_use: { label: '使用中', color: 'bg-blue-100 text-blue-700', emoji: '📤' },
  found: { label: '保管中', color: 'bg-yellow-100 text-yellow-700', emoji: '📬' },
  claimed: { label: '引渡済', color: 'bg-gray-100 text-gray-500', emoji: '✔️' },
  broken: { label: '修理中', color: 'bg-red-100 text-red-600', emoji: '🔧' },
  lost: { label: '紛失', color: 'bg-red-100 text-red-700', emoji: '❌' },
}

export default function EquipmentClient({ items: initItems, isAdmin, userId }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initItems)
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'lost_found',
    quantity: '1',
    location: '',
    found_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory
    const matchQ = !query || item.name.includes(query) || (item.location ?? '').includes(query)
    return matchCat && matchQ
  })

  async function addItem() {
    setAdding(true)
    const { data, error } = await supabase
      .from('equipment_items')
      .insert({
        name: form.name,
        description: form.description || null,
        category: form.category,
        quantity: parseInt(form.quantity) || 1,
        location: form.location || null,
        found_date: form.category === 'lost_found' ? form.found_date : null,
        notes: form.notes || null,
        status: form.category === 'lost_found' ? 'found' : 'available',
        reported_by: userId,
      })
      .select('*, profiles(full_name)')
      .single()

    if (!error && data) {
      setItems(prev => [data, ...prev])
      setForm({ name: '', description: '', category: 'lost_found', quantity: '1', location: '', found_date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
      setShowAdd(false)
    }
    setAdding(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('equipment_items').update({ status }).eq('id', id)
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('equipment_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const lostFoundActive = filtered.filter(i => i.category === 'lost_found' && i.status !== 'claimed')
  const equipmentActive = filtered.filter(i => i.category === 'equipment')
  const archived = filtered.filter(i => i.category === 'lost_found' && i.status === 'claimed')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">忘れ物・備品管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">落し物・備品の在庫状況</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? 'キャンセル' : '登録'}
        </button>
      </div>

      {/* 登録フォーム */}
      {showAdd && (
        <div className="bg-white rounded-xl border-2 border-green-400 p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-3">新規登録</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">種別</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="lost_found">忘れ物</option>
                  <option value="equipment">備品</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">名前・内容</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例：赤いタオル" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {form.category === 'lost_found' ? '発見場所' : '保管場所'}
                </label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例：更衣室" />
              </div>
              {form.category === 'lost_found' ? (
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">発見日</label>
                  <input type="date" value={form.found_date} onChange={e => setForm(f => ({ ...f, found_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              ) : (
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">数量</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min="1" />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">備考</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="色・特徴など" />
            </div>
            <button onClick={addItem} disabled={!form.name || adding} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-40">
              {adding ? '登録中...' : '登録する'}
            </button>
          </div>
        </div>
      )}

      {/* カテゴリタブ */}
      <div className="flex gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 検索 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="名前・場所で検索..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      {/* 忘れ物一覧 */}
      {(activeCategory === 'all' || activeCategory === 'lost_found') && lostFoundActive.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
            🔍 忘れ物（保管中 {lostFoundActive.length}件）
          </h2>
          <div className="space-y-2">
            {lostFoundActive.map(item => <ItemCard key={item.id} item={item} isAdmin={isAdmin} onStatusChange={updateStatus} onDelete={deleteItem} />)}
          </div>
        </div>
      )}

      {/* 備品一覧 */}
      {(activeCategory === 'all' || activeCategory === 'equipment') && equipmentActive.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">🏋️ 備品一覧</h2>
          <div className="space-y-2">
            {equipmentActive.map(item => <ItemCard key={item.id} item={item} isAdmin={isAdmin} onStatusChange={updateStatus} onDelete={deleteItem} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Package size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">登録されたアイテムがありません</p>
        </div>
      )}

      {/* 引渡済アーカイブ */}
      {archived.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">✔️ 引渡済（{archived.length}件）</h2>
          <div className="space-y-1.5 opacity-50">
            {archived.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  {item.location && <span className="text-xs text-gray-400 ml-2">{item.location}</span>}
                </div>
                <span className="text-xs text-gray-400">{item.found_date && format(new Date(item.found_date), 'M/d')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, isAdmin, onStatusChange, onDelete }: {
  item: EquipmentItem
  isAdmin: boolean
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const st = STATUS_CONFIG[item.status] ?? { label: item.status, color: 'bg-gray-100 text-gray-500', emoji: '?' }
  const isLost = item.category === 'lost_found'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isLost ? 'bg-amber-50' : 'bg-blue-50'}`}>
          {isLost ? '🔍' : '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900">{item.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
              {st.emoji} {st.label}
            </span>
          </div>
          {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
          {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
          <div className="flex gap-3 mt-1.5 flex-wrap">
            {item.location && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={10} />
                {item.location}
              </span>
            )}
            {item.found_date && (
              <span className="text-xs text-gray-400">
                発見: {format(new Date(item.found_date), 'M月d日', { locale: ja })}
              </span>
            )}
            {!isLost && item.quantity > 1 && (
              <span className="text-xs text-gray-400">数量: {item.quantity}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* 状態変更 */}
          {isLost ? (
            item.status !== 'claimed' && (
              <button
                onClick={() => onStatusChange(item.id, 'claimed')}
                className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-200 font-medium"
              >
                <CheckCircle2 size={12} />
                引渡済にする
              </button>
            )
          ) : (
            <select
              value={item.status}
              onChange={e => onStatusChange(item.id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
            >
              <option value="available">使用可</option>
              <option value="in_use">使用中</option>
              <option value="broken">修理中</option>
              <option value="lost">紛失</option>
            </select>
          )}
          {isAdmin && (
            <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-400 p-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
