'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

// クラブのメンバーコード（オーナーが会員に伝える合言葉）
const MEMBER_CODE = 'v1999'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 合言葉チェック
    if (form.code.trim().toLowerCase() !== MEMBER_CODE) {
      setError('合言葉が違います。スタッフに確認してください。')
      return
    }
    if (form.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.name.trim() } },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
        setError('このメールアドレスはすでに登録されています。ログインしてください。')
      } else {
        setError('登録に失敗しました。もう一度お試しください。')
      }
      setLoading(false)
      return
    }

    // 即時ログイン成功
    if (data.user && data.session) {
      router.push('/dashboard')
      return
    }

    // メール確認が必要な場合
    setRegistered(true)
    setLoading(false)
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">確認メールを送信しました</h2>
            <p className="text-sm text-gray-500 mb-2">
              <span className="font-medium text-gray-700">{form.email}</span> に確認メールを送りました。
            </p>
            <p className="text-sm text-gray-500 mb-6">メール内のリンクをクリックして登録完了です。</p>
            <Link href="/login" className="text-green-700 font-medium hover:underline text-sm">
              ← ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ヴェルディ相模原</h1>
          <p className="text-green-200 text-sm mt-1">会員専用ポータル</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">新規登録</h2>
          <p className="text-sm text-gray-500 mb-6">スタッフから教わった合言葉で登録できます</p>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* お名前 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="山田 太郎"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="name"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="example@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="email"
              />
            </div>

            {/* パスワード */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                パスワード <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-1">（6文字以上）</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 合言葉 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                合言葉 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="スタッフに確認してください"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">※ スタッフから伝えられた合言葉を入力してください</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            すでに登録済みの方は{' '}
            <Link href="/login" className="text-green-700 font-medium hover:underline">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
