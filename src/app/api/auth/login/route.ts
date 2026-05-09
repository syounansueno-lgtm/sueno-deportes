import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // IPアドレス取得
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // レート制限チェック（15分間に5回まで）
  const { allowed, remaining, resetAt } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)

  if (!allowed) {
    const waitMin = Math.ceil((resetAt - Date.now()) / 60000)
    return NextResponse.json(
      { error: `ログイン試行回数が多すぎます。${waitMin}分後に再試行してください。` },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        }
      }
    )
  }

  const { email, password } = await req.json()

  // 入力バリデーション
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }
  if (email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが間違っています', remaining },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: true })
}
