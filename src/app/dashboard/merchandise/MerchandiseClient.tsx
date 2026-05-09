'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Plus, X, CheckCircle2, Package, Tag } from 'lucide-react'

type Item = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string
  sizes: string[] | null
  stock: number | null
  is_available: boolean
}

type Order = {
  id: string
  item_id: string
  quantity: number
  size: string | null
  note: string | null
  status: string
  created_at: string
  merchandise_items: { name: string; price: number } | null
}

type Props = {
  items: Item[]
  myOrders: Order[]
  allOrders: Order[]
  isAdmin: boolean
  userId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  uniform: 'ユニフォーム',
  goods: 'グッズ',
  equipment: '用具',
  other: 'その他',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '注文受付中', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '確定', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: '受渡済み', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-500' },
}

export default function MerchandiseClient({ items: initItems, myOrders: initMyOrders, allOrders: initAllOrders, isAdmin, userId }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initItems)
  const [myOrders, setMyOrders] = useState(initMyOrders)
  const [allOrders, setAllOrders] = useState(initAllOrders)
  const [activeTab, setActiveTab] = useState<'shop' | 'myorders' | 'manage'>('shop')
  const [orderTarget, setOrderTarget] = useState<Item | null>(null)
  const [orderForm, setOrderForm] = useState({ quantity: 1, size: '', note: '' })
  const [ordering, setOrdering] = useState(false)
  const [orderDone, setOrderDone] = useState(false)

  // 管理者用：新商品追加
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: 'goods', sizes: '', stock: '' })
  const [addingItem, setAddingItem] = useState(false)

  async function submitOrder() {
    if (!orderTarget) return
    setOrdering(true)
    const { data, error } = await supabase
      .from('merchandise_orders')
      .insert({
        item_id: orderTarget.id,
        user_id: userId,
        quantity: orderForm.quantity,
        size: orderForm.size || null,
        note: orderForm.note || null,
      })
      .select('*, merchandise_items(name, price)')
      .single()

    if (!error && data) {
      setMyOrders(prev => [data, ...prev])
      setOrderDone(true)
      setTimeout(() => {
        setOrderTarget(null)
        setOrderDone(false)
        setOrderForm({ quantity: 1, size: '', note: '' })
      }, 1500)
    }
    setOrdering(false)
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from('merchandise_orders')
      .update({ status })
      .eq('id', orderId)
    if (!error) {
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    }
  }

  async function addItem() {
    setAddingItem(true)
    const sizesArr = newItem.sizes ? newItem.sizes.split(',').map(s => s.trim()).filter(Boolean) : null
    const { data, error } = await supabase
      .from('merchandise_items')
      .insert({
        name: newItem.name,
        description: newItem.description || null,
        price: parseInt(newItem.price) || 0,
        category: newItem.category,
        sizes: sizesArr,
        stock: newItem.stock ? parseInt(newItem.stock) : null,
        created_by: userId,
      })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [data, ...prev])
      setNewItem({ name: '', description: '', price: '', category: 'goods', sizes: '', stock: '' })
      setShowAddItem(false)
    }
    setAddingItem(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">物販・注文</h1>
          <p className="text-sm text-gray-500 mt-0.5">ユニフォーム・グッズの注文管理</p>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {[
          { key: 'shop', label: '商品一覧' },
          { key: 'myorders', label: `注文履歴 (${myOrders.length})` },
          ...(isAdmin ? [{ key: 'manage', label: `全注文管理 (${allOrders.filter(o => o.status === 'pending').length}件)` }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 商品一覧タブ */}
      {activeTab === 'shop' && (
        <>
          {isAdmin && (
            <div className="mb-4">
              {!showAddItem ? (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 text-sm text-green-600 font-medium border border-green-300 px-3 py-2 rounded-lg hover:bg-green-50"
                >
                  <Plus size={16} />商品を追加
                </button>
              ) : (
                <div className="bg-white rounded-xl border-2 border-green-400 p-4 mb-4">
                  <h3 className="font-bold text-gray-800 mb-3">新商品追加</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">商品名</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="例：ヴェルディTシャツ" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">説明</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder="商品の説明" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">価格（円）</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} placeholder="3000" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">カテゴリ</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}>
                        <option value="uniform">ユニフォーム</option>
                        <option value="goods">グッズ</option>
                        <option value="equipment">用具</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">サイズ（カンマ区切り）</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.sizes} onChange={e => setNewItem(p => ({ ...p, sizes: e.target.value }))} placeholder="S,M,L,XL" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">在庫数（任意）</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newItem.stock} onChange={e => setNewItem(p => ({ ...p, stock: e.target.value }))} placeholder="50" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={addItem} disabled={!newItem.name || addingItem} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                      {addingItem ? '追加中...' : '追加する'}
                    </button>
                    <button onClick={() => setShowAddItem(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Package size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">商品がありません</p>
              {isAdmin && <p className="text-sm text-gray-400 mt-1">「商品を追加」から登録してください</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.filter(i => i.is_available).map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 h-32 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag size={40} className="text-gray-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-gray-900">
                        {item.price === 0 ? '無料' : `¥${item.price.toLocaleString()}`}
                      </span>
                      {item.stock !== null && (
                        <span className="text-xs text-gray-400">在庫 {item.stock}点</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setOrderTarget(item); setOrderForm({ quantity: 1, size: item.sizes?.[0] ?? '', note: '' }) }}
                      className="mt-3 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      注文する
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 注文履歴タブ */}
      {activeTab === 'myorders' && (
        <div className="space-y-3">
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
              注文履歴がありません
            </div>
          ) : myOrders.map(order => {
            const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{order.merchandise_items?.name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>数量: {order.quantity}</span>
                      {order.size && <span>サイズ: {order.size}</span>}
                      {order.note && <span>備考: {order.note}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      ¥{((order.merchandise_items?.price ?? 0) * order.quantity).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 管理者：全注文タブ */}
      {activeTab === 'manage' && isAdmin && (
        <div className="space-y-3">
          {allOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">注文がありません</div>
          ) : allOrders.map((order: any) => {
            const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{order.merchandise_items?.name}</p>
                    <p className="text-sm text-gray-600">{order.profiles?.full_name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>数量: {order.quantity}</span>
                      {order.size && <span>サイズ: {order.size}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    <select
                      value={order.status}
                      onChange={e => updateOrderStatus(order.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1"
                    >
                      <option value="pending">受付中</option>
                      <option value="confirmed">確定</option>
                      <option value="delivered">受渡済み</option>
                      <option value="cancelled">キャンセル</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 注文モーダル */}
      {orderTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => !ordering && setOrderTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            {orderDone ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                <p className="font-bold text-gray-900">注文しました！</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{orderTarget.name}</h3>
                <p className="text-green-700 font-bold text-xl mb-4">
                  {orderTarget.price === 0 ? '無料' : `¥${orderTarget.price.toLocaleString()}`}
                </p>
                <div className="space-y-3 mb-5">
                  {orderTarget.sizes && orderTarget.sizes.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">サイズ</label>
                      <div className="flex gap-2 flex-wrap">
                        {orderTarget.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setOrderForm(f => ({ ...f, size }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              orderForm.size === size
                                ? 'bg-green-600 text-white border-green-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">数量</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setOrderForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))} className="w-10 h-10 border border-gray-300 rounded-lg text-xl font-bold hover:bg-gray-50">-</button>
                      <span className="font-bold text-xl w-8 text-center">{orderForm.quantity}</span>
                      <button onClick={() => setOrderForm(f => ({ ...f, quantity: f.quantity + 1 }))} className="w-10 h-10 border border-gray-300 rounded-lg text-xl font-bold hover:bg-gray-50">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">備考（任意）</label>
                    <input
                      type="text"
                      value={orderForm.note}
                      onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="名前入りなど特記事項"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setOrderTarget(null)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-600">キャンセル</button>
                  <button onClick={submitOrder} disabled={ordering} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                    {ordering ? '注文中...' : `注文する (¥${(orderTarget.price * orderForm.quantity).toLocaleString()})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
