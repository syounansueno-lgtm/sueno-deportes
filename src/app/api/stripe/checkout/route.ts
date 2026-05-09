import { NextRequest, NextResponse } from 'next/server'
import { stripe, calculateWithFee } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json()

  // プランを取得
  const { data: plan } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single()

  // Stripeカスタマー作成または取得
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      name: profile?.full_name,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  // 手数料計算（会員負担）
  const { total, fee } = calculateWithFee(plan.amount)

  // Stripeに価格がなければ作成
  let priceId = plan.stripe_price_id
  if (!priceId) {
    const price = await stripe.prices.create({
      unit_amount: total, // 手数料込みの金額
      currency: 'jpy',
      recurring: { interval: 'month' },
      product_data: {
        name: plan.name,
        metadata: { base_amount: plan.amount, fee_amount: fee },
      },
    })
    priceId = price.id
    await supabase.from('membership_plans').update({ stripe_price_id: priceId }).eq('id', planId)
  }

  // Checkoutセッション作成
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      base_amount: plan.amount,
      fee_amount: fee,
    },
    // 手数料の説明を会員に表示
    custom_text: {
      submit: {
        message: `月額${plan.amount.toLocaleString()}円（Stripe決済手数料${fee.toLocaleString()}円を含む合計${total.toLocaleString()}円）が毎月自動引き落としされます`,
      },
    },
    locale: 'ja',
  })

  return NextResponse.json({ url: session.url })
}
