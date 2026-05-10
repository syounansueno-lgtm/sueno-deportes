import crypto from 'crypto'
import { NextRequest } from 'next/server'

// LINEからのリクエストを署名検証する
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// LINEグループにメッセージを送信する
async function replyToLine(replyToken: string, message: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: message }],
    }),
  })
}

async function pushToLine(to: string, message: string) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text: message }],
    }),
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-line-signature') ?? ''
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? ''

  // 署名検証（セキュリティ）
  if (channelSecret && !verifySignature(rawBody, signature, channelSecret)) {
    console.error('LINE Webhook: 署名検証失敗')
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  for (const event of payload.events ?? []) {
    // ボットがグループに追加されたとき
    if (event.type === 'join' && event.source?.type === 'group') {
      const groupId = event.source.groupId
      console.log('✅ LINE グループID取得:', groupId)

      // グループIDをグループ内で通知（管理者がコピーできるように）
      await pushToLine(
        groupId,
        `✅ ヴェルディ相模原 スタッフシステムと接続しました！\n\n` +
        `以下のグループIDをVercelの環境変数に設定してください：\n\n` +
        `LINE_GROUP_ID\n${groupId}\n\n` +
        `設定が完了すると、告知が自動でここに届くようになります。`
      )
    }

    // ボットがグループから退出させられたとき
    if (event.type === 'leave') {
      console.log('LINE ボットがグループから退出されました')
    }

    // ユーザーがボットを友達追加したとき（個人通知用）
    if (event.type === 'follow') {
      const userId = event.source?.userId
      if (userId && event.replyToken) {
        await replyToLine(
          event.replyToken,
          `友達追加ありがとうございます！\nヴェルディ相模原 スタッフシステムからの通知をお届けします。`
        )
      }
    }
  }

  return new Response('OK', { status: 200 })
}

// LINEのWebhook検証用（GET リクエスト）
export async function GET() {
  return new Response('LINE Webhook OK', { status: 200 })
}
