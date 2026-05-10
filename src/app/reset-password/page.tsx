'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabaseがリセットリンクのcodeを自動処理してセッションを設定する
    const code = searchParams.get('code')
    if (!code) {
      setError('無効なリンクです。もう一度パスワードリセットを申請してください。')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('リンクの有効期限が切れています。もう一度パスワードリセットを申請してください。')
      } else {
        setReady(true)
      }
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  // 完了画面
  if (done) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">パスワードを更新しました</h2>
          <p className="text-sm text-gray-500">ダッシュボードに移動します...</p>
        </CardContent>
      </Card>
    )
  }

  // エラー画面（無効なリンク）
  if (error && !ready) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">リンクが無効です</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-green-700 font-medium hover:underline text-sm"
          >
            ← ログインページに戻る
          </button>
        </CardContent>
      </Card>
    )
  }

  // ローディング（code確認中）
  if (!ready) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-sm text-gray-500">確認中...</p>
        </CardContent>
      </Card>
    )
  }

  // パスワード入力フォーム
  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl">新しいパスワードを設定</CardTitle>
        <CardDescription>8文字以上の新しいパスワードを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              新しいパスワード <span className="text-red-500 text-xs">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="8文字以上"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
                type={showConfirm ? 'text' : 'password'}
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showConfirm ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* パスワード強度インジケーター */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= i * 3
                        ? password.length >= 12
                          ? 'bg-green-500'
                          : password.length >= 8
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {password.length < 8 ? '短すぎます' : password.length < 12 ? '普通' : '強いパスワード'}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800"
            disabled={loading}
          >
            {loading ? '更新中...' : 'パスワードを更新する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">スエニョデポルテス</h1>
          <p className="text-green-200 text-sm mt-1">パスワードリセット</p>
        </div>
        <Suspense fallback={
          <Card className="shadow-2xl">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-sm text-gray-500">読み込み中...</p>
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
