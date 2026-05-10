'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが間違っています')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError('メール送信に失敗しました。メールアドレスを確認してください。')
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴエリア */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">スエニョデポルテス</h1>
          <p className="text-green-200 text-sm mt-1">会員専用ポータル</p>
        </div>

        <Card className="shadow-2xl">
          {!resetMode ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl">ログイン</CardTitle>
                <CardDescription>メールアドレスとパスワードを入力してください</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">パスワード</Label>
                      <button
                        type="button"
                        onClick={() => setResetMode(true)}
                        className="text-xs text-green-700 hover:underline"
                      >
                        パスワードを忘れた方
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
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
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
                  )}
                  <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
                    {loading ? 'ログイン中...' : 'ログイン'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-500">
                  アカウントをお持ちでない方は{' '}
                  <Link href="/register" className="text-green-700 font-medium hover:underline">
                    新規登録
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">パスワードリセット</CardTitle>
                <CardDescription>
                  登録済みのメールアドレスを入力してください。再設定用リンクをお送りします。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-3">📧</div>
                    <p className="font-medium text-gray-800 mb-1">メールを送信しました</p>
                    <p className="text-sm text-gray-500 mb-4">
                      {resetEmail} にリセット用リンクを送信しました。<br />
                      メールをご確認ください。
                    </p>
                    <button
                      onClick={() => { setResetMode(false); setResetSent(false) }}
                      className="text-sm text-green-700 hover:underline"
                    >
                      ← ログインに戻る
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">メールアドレス</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="example@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
                    )}
                    <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
                      {loading ? '送信中...' : 'リセットメールを送信'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setResetMode(false); setError('') }}
                      className="w-full text-sm text-gray-500 hover:underline"
                    >
                      ← ログインに戻る
                    </button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
