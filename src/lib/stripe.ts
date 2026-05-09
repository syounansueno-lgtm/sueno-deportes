import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// 手数料を会員負担にする計算
// Stripeの手数料3.6%を会員が払うよう、金額に上乗せ
export function calculateWithFee(amountYen: number): { total: number; fee: number } {
  // 会員が払う総額 = 本来の金額 / (1 - 0.036)
  const total = Math.ceil(amountYen / (1 - 0.036))
  const fee = total - amountYen
  return { total, fee }
}
