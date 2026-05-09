'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
        </Card>
      </div>
    </div>
  )
}
