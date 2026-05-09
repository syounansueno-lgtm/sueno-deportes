import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react'
import type { Profile, Payment } from '@/types'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 管理者チェック
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [paymentsRes, membersRes, pendingRes] = await Promise.all([
    supabase.from('payments')
      .select('*, profile:profiles(full_name, sports)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('profiles').select('id, membership_status').eq('membership_status', 'active'),
    supabase.from('payments').select('id, user_id, amount, profile:profiles(full_name)')
      .eq('status', 'pending'),
  ])

  const payments = paymentsRes.data ?? []
  const activeMembers = membersRes.data ?? []
  const pendingPayments = pendingRes.data ?? []

  // 今月の収入
  const thisMonthPayments = payments.filter(p =>
    p.status === 'paid' && p.created_at >= firstOfMonth
  )
  const thisMonthIncome = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0)

  // 未払い合計
  const pendingTotal = pendingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

  const STATUS_LABELS: Record<string, string> = {
    paid: '支払済',
    pending: '未払い',
    failed: '失敗',
    refunded: '返金',
  }
  const STATUS_COLORS: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">経理・会費管理</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-xs text-gray-500">今月の収入</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{thisMonthIncome.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">{thisMonthPayments.length}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-yellow-500" />
              <p className="text-xs text-gray-500">未払い合計</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              ¥{pendingTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">{pendingPayments.length}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-blue-600" />
              <p className="text-xs text-gray-500">有効会員数</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeMembers.length}</p>
            <p className="text-xs text-gray-400 mt-1">名</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-purple-600" />
              <p className="text-xs text-gray-500">今月 手数料収入</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ¥{thisMonthPayments.reduce((s: number, p: { fee_amount: number }) => s + p.fee_amount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">会員負担分</p>
          </CardContent>
        </Card>
      </div>

      {/* 未払いアラート */}
      {pendingPayments.length > 0 && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <AlertCircle size={18} />
              未払い会員 ({pendingPayments.length}名)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPayments.map((p: { id: string; profile: { full_name: string }[] | { full_name: string } | null; amount: number }) => {
                const name = Array.isArray(p.profile) ? p.profile[0]?.full_name : p.profile?.full_name
                return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{name ?? '不明'}</span>
                  <span className="text-yellow-700 font-bold">¥{p.amount.toLocaleString()}</span>
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 支払い履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">支払い履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-xs">
                  <th className="text-left pb-2 font-medium">会員名</th>
                  <th className="text-left pb-2 font-medium">内容</th>
                  <th className="text-right pb-2 font-medium">金額</th>
                  <th className="text-right pb-2 font-medium">手数料</th>
                  <th className="text-center pb-2 font-medium">状態</th>
                  <th className="text-right pb-2 font-medium">日付</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">支払い記録はありません</td>
                  </tr>
                ) : payments.map((p: {
                  id: string
                  profile: { full_name: string } | null
                  description: string
                  amount: number
                  fee_amount: number
                  status: string
                  paid_at: string | null
                  created_at: string
                }) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium">{p.profile?.full_name ?? '不明'}</td>
                    <td className="py-2.5 text-gray-600">{p.description}</td>
                    <td className="py-2.5 text-right font-medium">¥{p.amount.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-400">¥{p.fee_amount.toLocaleString()}</td>
                    <td className="py-2.5 text-center">
                      <Badge className={STATUS_COLORS[p.status]}>
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right text-gray-400 text-xs">
                      {format(new Date(p.paid_at ?? p.created_at), 'M/d HH:mm', { locale: ja })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
