import { NextRequest } from 'next/server'

type NotifyBody = {
  title: string
  body: string
  is_urgent: boolean
}

export async function POST(request: NextRequest) {
  const groupId = process.env.LINE_GROUP_ID
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

  // 環境変数が未設定の場合はスキップ（エラーにしない）
  if (!groupId || !token) {
    console.warn('LINE通知スキップ: LINE_GROUP_ID または LINE_CHANNEL_ACCESS_TOKEN が未設定')
    return Response.json({ ok: false, reason: 'LINE not configured' })
  }

  let body: NotifyBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, reason: 'Invalid JSON' }, { status: 400 })
  }

  const { title, body: content, is_urgent } = body

  // LINEに送るメッセージを組み立て
  const prefix = is_urgent ? '🚨【緊急告知】' : '📢【重要告知】'
  const bodyPreview = content.length > 200 ? content.slice(0, 200) + '…' : content
  const message = [
    prefix,
    '━━━━━━━━━━━━━━━━',
    title,
    '',
    bodyPreview,
    '━━━━━━━━━━━━━━━━',
    '▶ 詳細はスタッフシステムで確認',
    'https://sueno-deportes.vercel.app/dashboard/announcements',
  ].join('\n')

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: message }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('LINE送信エラー:', err)
      return Response.json({ ok: false, reason: err }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('LINE送信例外:', e)
    return Response.json({ ok: false, reason: 'Network error' }, { status: 500 })
  }
}
