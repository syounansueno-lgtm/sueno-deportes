import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const baseAmount = Number(session.metadata?.base_amount ?? 0)
      const feeAmount = Number(session.metadata?.fee_amount ?? 0)

      if (userId) {
        await getSupabase().from('payments').insert({
          user_id: userId,
          amount: baseAmount,
          fee_amount: feeAmount,
          description: '月額会費',
          status: 'paid',
          stripe_subscription_id: session.subscription as string,
          paid_at: new Date().toISOString(),
        })
        await getSupabase().from('profiles')
          .update({ membership_status: 'active' })
          .eq('id', userId)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      const customerId = invoice.customer as string
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await getSupabase().from('payments').insert({
          user_id: profile.id,
          amount: Math.round((invoice.amount_paid ?? 0) * 0.964), // 手数料を除いた本体
          fee_amount: Math.round((invoice.amount_paid ?? 0) * 0.036),
          description: '月額会費（自動更新）',
          status: 'paid',
          stripe_payment_intent_id: (invoice as { payment_intent?: string }).payment_intent ?? null,
          paid_at: new Date().toISOString(),
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customerId = invoice.customer as string
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await getSupabase().from('payments').insert({
          user_id: profile.id,
          amount: invoice.amount_due ?? 0,
          fee_amount: 0,
          description: '月額会費（支払い失敗）',
          status: 'failed',
        })
        await getSupabase().from('profiles')
          .update({ membership_status: 'inactive' })
          .eq('id', profile.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
