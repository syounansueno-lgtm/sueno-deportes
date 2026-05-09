import { createClient } from '@/lib/supabase/server'
import MerchandiseClient from './MerchandiseClient'

export default async function MerchandisePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const [itemsRes, myOrdersRes, allOrdersRes] = await Promise.all([
    supabase.from('merchandise_items').select('*').eq('is_available', true).order('created_at', { ascending: false }),
    supabase.from('merchandise_orders').select('*, merchandise_items(name, price)').eq('user_id', user.id).order('created_at', { ascending: false }),
    isAdmin
      ? supabase.from('merchandise_orders').select('*, merchandise_items(name, price), profiles(full_name)').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  return (
    <MerchandiseClient
      items={(itemsRes.data ?? []) as any}
      myOrders={(myOrdersRes.data ?? []) as any}
      allOrders={(allOrdersRes.data ?? []) as any}
      isAdmin={isAdmin}
      userId={user.id}
    />
  )
}
