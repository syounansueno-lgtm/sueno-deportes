// IPアドレスベースのシンプルなレート制限
// メモリ内で管理（本番環境ではRedis推奨）
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  ip: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000 // 15分
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = ip

  const current = attempts.get(key)

  if (!current || now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs }
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count++
  return { allowed: true, remaining: maxAttempts - current.count, resetAt: current.resetAt }
}

// 古いエントリを定期的に削除（メモリリーク防止）
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of attempts.entries()) {
    if (now > value.resetAt) attempts.delete(key)
  }
}, 60 * 1000)
