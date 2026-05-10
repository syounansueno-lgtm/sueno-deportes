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
import { Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

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
    if (form.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (form.sports.length === 0) {
      setError('参加する競技を1つ以上選択してください')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone: form.phone,
          sports: form.sports,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
        setError('このメールアドレスはすでに登録されています。ログインページからログインしてください。')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // メール確認が必要な場合
    if (data.user && !data.session) {
      setRegistered(true)
      setLoading(false)
      return
    }

    // 即時ログイン成功（メール確認不要の設定の場合）
    if (data.user && data.session) {
      // プロフィール更新（sports・phone）
      await supabase.from('profiles').update({
        phone: form.phone,
        sports: form.sports,
      }).eq('id', data.user.id)

      router.push('/dashboard')
      return
    }

    setLoading(false)
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">確認メールを送信しました</h2>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-medium text-gray-700">{form.email}</span> に確認メールを送信しました。
              </p>
              <p className="text-sm text-gray-500 mb-6">
                メール内のリンクをクリックして登録を完了してください。
              </p>
              <Link href="/login" className="text-green-700 font-medium hover:underline text-sm">
                ← ログインページに戻る
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
                <Label htmlFor="full_name">
                  お名前 <span className="text-red-500 text-xs">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="山田 太郎"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  メールアドレス <span className="text-red-500 text-xs">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  autoComplete="email"
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
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  参加する競技 <span className="text-red-500 text-xs">*</span>
                  <span className="text-xs text-gray-400 ml-1">（複数選択可）</span>
                </Label>
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
                      {form.sports.includes(sport) ? '✓ ' : ''}{SPORT_LABELS[sport].split('（')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  パスワード <span className="text-red-500 text-xs">*</span>
                  <span className="text-xs text-gray-400 ml-1">（8文字以上）</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8文字以上"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  パスワード（確認） <span className="text-red-500 text-xs">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="パスワードを再入力"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
