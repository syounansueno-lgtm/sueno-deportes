'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SPORT_LABELS, type Sport } from '@/types'

const SPORTS: Sport[] = ['soccer', 'karate', 'pickleball', 'gymnastics']

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    sports: [] as Sport[],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleSport(sport: Sport) {
    setForm(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport],
    }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (form.sports.length === 0) {
      setError('参加する競技を1つ以上選択してください')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // プロフィール更新（sports・phone）
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        phone: form.phone,
        sports: form.sports,
      }).eq('id', user.id)
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">スエニョデポルテス</h1>
          <p className="text-green-200 text-sm mt-1">会員専用ポータル</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">新規会員登録</CardTitle>
            <CardDescription>必要事項を入力してアカウントを作成してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">お名前</Label>
                <Input
                  id="full_name"
                  placeholder="山田 太郎"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="090-1234-5678"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>参加する競技（複数選択可）</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map(sport => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                        form.sports.includes(sport)
                          ? 'border-green-600 bg-green-50 text-green-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {SPORT_LABELS[sport].split('（')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="パスワードを再入力"
                  value={form.confirmPassword}
                  onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
                {loading ? '登録中...' : '会員登録する'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-500">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-green-700 font-medium hover:underline">
                ログイン
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
